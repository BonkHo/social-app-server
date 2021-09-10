const { model, Schema } = require('mongoose');

// User Schema
const userSchema = new Schema({
    username: String,
    password: String,
    email: String,
    createdAt: String
});

module.exports = model('User', userSchema)