/*
    Contact
    ---------------------------
    Jordan Anodjo
    jjanodjo@svsu.edu

    Description
    ---------------------------
    A web shop where users can sell and purchase from other users.

*/

const express = require("express")
const path = require('path')
const app = express()
const port = 3000
const fs = require("fs")
app.listen(port)

// Setting path where templates will be in.
app.set('views', path.join(__dirname, 'views'))

// Setting which engine we will be using.
app.set('view engine', 'ejs')

// Setting the configurations for all routes
app.use(express.urlencoded({ extended: true }))

// Allows the use of public files.
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.render('homepage')
})

// Go to user account
app.get('/user/:username', (req, res) => {
    const usersItems = getAllItems().filter(user => user.user_name !== req.params.username)
    const user = readUsers('users.json').find(user => user.user_name === req.params.username)
    res.render('userpage', {user: user, usersItems:usersItems})
})

// Purchase selected user item.
app.post('/buy', (req, res) => {
 
    buyItem(req.body.user_name , parseInt(req.body.id))
    res.redirect('/user/' + req.body.user_name)
})

// Directs user to their profile
app.post('/login', (req, res) => {
    if (userExist(req.body.user_name)){
        res.redirect('/user/' + req.body.user_name)
    } else {
        res.redirect('/')
    }
})

// Creates an account for user
app.post('/register', (req, res) => {
    const data = fs.readFileSync("users.json")

    // Check if the input is valid
    if (req.body.user_name !== "" && req.body.name !== "" && req.body.balance >= 0) {

        // Create user if the user_name is not already taken
        if (addUser(req.body.name, req.body.user_name, req.body.balance)) {
            res.redirect('/user/' + req.body.user_name)
            console.log("Created User")
        } else {
            console.log("This username is already taken. Please choose a different one.")
            res.redirect('/')
        }
    } else {
        console.log("User inputs are invalid. Please submit valid inputs.")
        res.redirect('/')
    }

})

// ------------------------------- Functions -------------------------------

/**
 * This function accept a user_name, name, and balance.
 * Then saves those values into a list of users.
 * If the balance is not given the balance defualts to 100.
 * 
 * @param {string} user_name 
 * @param {string} name 
 * @param {number} balance 
 * 
 * @return Returns true if user could be added
 */
const addUser = (name, user_name, balance) => {
    // If the user_name (which is unique) does not exist create it.
    if (!userExist(user_name)) {
        const users = readUsers("users.json")

        // If the balance is not set, set it to 100.
        if (balance === undefined) {
            balance = 100
        }

        // Creating user object.
        const user = {
            "user_name": user_name,
            "name": name,
            "balance": balance,
            "transactions": [],
            "items": []
        }

        // Add to the users list.
        users.push(user)

        // Save the updated users list.
        writeUsers(users)

        return true

    } else {
        return false
    }
}

/**
 * Opens a .json file and return all values.
 * 
 * @returns a list of user objects and their associated items
 */
const readUsers = (filePath) => {
    let data = fs.readFileSync(filePath)
    let users = JSON.parse(data.toString())
    return users
}

/**
 * The function takes what is passed into it and saves it to a file.
 * 
 * @param {object} users 
 */
const writeUsers = (users) => {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2))
}

/**
 * Finds if id passed into it is already in use.
 * @param {number} id 
 * @returns True if it does exist, false otherwise.
 */
const idExist = (id) => {

    // Retieve all ids available.
    // Then find where an appId in appIds is equal to the id given.
    const appIds = getIds().find(appId => appId === id)

    // If appIds is not undefined that means the id passed exists.
    return (appIds !== undefined)
}

/**
 * Calculates all ids in the program
 * 
 * @returns all used ids in the program
 */
const getIds = () => {

    // Container for all the ids
    let ids = []

    // Retieve the data that holds all ids
    users = readUsers("users.json")

    // For each user in users grab each user's ids.
    users.forEach(user => {
        user.items.forEach(item => {
            ids.push(item.id)
        });
    });

    return ids
}

/**
 * Checks if the username given to it exists
 * 
 * @param {string} user_name 
 * @returns 
 */
const userExist = (user_name) => {
    // Opens the user.json file
    const users = readUsers("users.json")

    // Searches for all users that have the name of user_name
    const remainder = users.find(user => user.user_name === user_name)

    // Returns a boolean depending on if remainder is empty or not.
    return (remainder !== undefined)
}

/**
 * This function takes in the user_name of the buyer and the id of the item to be purchased.
 * If the all the prerequisites are true.
 * Add the purchased item to the buyer.
 * Remove the item from the seller.
 * Increment and decrement the seller's and buyer's balances respectively.
 * 
 * @param {string} user_name 
 * @param {number} item_id 
 */
const buyItem = (user_name, item_id) => {
    // The buyer must exist as a user.
    if (userExist(user_name)) {

        if (idExist(item_id)) { // The item the buyer wants to purchase must also exist.

            // Get file data.
            const users = readUsers("users.json")

            // Retrieve a reference to the buyer by the user_name.
            const buyer = users.find(user => user.user_name === user_name)

            // Retrieve a reference to the seller by the item id.
            const seller = users.find(user => user.items.find(item => item.id === item_id))

            // Retrieve the purchased item.
            const purchasedItem = seller.items.find(item => item.id === item_id)

            // The buyer cannot also be the seller.
            if (buyer.user_name !== seller.user_name) {

                // The buyer must have the money to purchase the item.
                if (buyer.balance >= purchasedItem.price) {

                    // Update the balances to reflect purchase.
                    buyer.balance -= purchasedItem.price
                    seller.balance += purchasedItem.price

                    // Remove the item selected in seller's items.
                    seller.items = seller.items.filter(item => item.id != purchasedItem.id);

                    // Add this transaction to the buyer's transactions list
                    buyer.transactions.push({
                        "itemId": purchasedItem.id,
                        "seller": seller.user_name,
                        "buyer": buyer.user_name,
                        "price": purchasedItem.price,
                        "date": new Date()
                    })

                    // Add item into buyer's items.
                    buyer.items.push(purchasedItem)

                    // Save updated users to file.
                    writeUsers(users)

                    // Thank user. 
                    console.log("Transaction successful. Thanks for your order!")

                } else { console.log("Insufficient funds!") }
            } else { console.log("You already own this item!") }
        } else { console.log("Cannot find item with id given!") }
    } else { console.log("Cannot find user with username given!") }
}

const getAllItems = () => {
    // Get file data.
    const users = readUsers("users.json")
    let userItems = []
    users.forEach(user => {
        const userObj = {user_name: user.user_name, items:[]}
        user.items.forEach(item => {
            userObj.items.push(item)
        })
        userItems.push(userObj)
    })

    return userItems
}
