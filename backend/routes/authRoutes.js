import express, { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'

// Register a new user endpoint /auth/register
router.post('/register', (req,res) => {
   const {username , password} = req.body
   if (!username || !password) {
      return res.status(400).send({ message: 'username and password are required' })
   }
   // save the username and encrypted password
   // save gilgamesh@gmail.com | askfjfhffthe.dhgt...eygd...fhft...yrg
   
   //encrypt the password
   const hashedPassword = bcrypt.hashSync(password, 8)
   try {
       console.log('Registering user:', username)
       const insertUser = db.prepare(`INSERT INTO users (username , password)
        VALUES (? , ?) `)
        const result =  insertUser.run(username , hashedPassword)
        console.log('User registered with ID:', result.lastInsertRowid)

        // now that we have a user , I want to add their first todo for them 
        const defaultTodo = `Hello :) Add your first todo!`
        const insertTodo = db.prepare(`INSERT INTO todos (user_id, task )
        VALUES (? ,?) `)
        insertTodo.run(result.lastInsertRowid, defaultTodo)

        // create a token 
        const token = jwt.sign({id: result.lastInsertRowid} , 
            JWT_SECRET , {expiresIn: '24h'})
            res.json({token})
   } catch (err) {
       console.log(err.message)
       if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
         return res.status(409).send({ message: 'username already exists' })
       }
       res.sendStatus(503)
   }


})

router.post('/login' , (req,res) => {
   // we get their email and we look up the password 
   const {username ,password} = req.body
   if (!username || !password) {
      return res.status(400).send({ message: 'username and password are required' })
   }

   try {
     const getUser = db.prepare('SELECT * FROM users WHERE username = ?')
     const user = getUser.get(username)
     
     console.log('Login attempt for username:', username)
     console.log('User found:', user ? 'Yes' : 'No')

     if(!user) {return res.status(404).send({message:"User not found"})}

     const isPasswordValid = bcrypt.compareSync(password, user.password)
     if (!isPasswordValid) {
       return res.status(401).send({ message: 'Invalid password' })
     }
     console.log(user)

     const token = jwt.sign({ id: user.id } , JWT_SECRET , {
        expiresIn : '24h'
     } )
     res.json({token})
   } catch (err) {
        console.log(err.message)
        res.sendStatus(503)
     
      }
})

// Logout endpoint
router.post('/logout', (req, res) => {
   // For JWT-based authentication, logout is typically handled client-side
   // by removing the token. However, we can implement server-side logout
   // by maintaining a blacklist of invalidated tokens if needed.
   
   // For now, we'll just send a success response
   // The client should remove the token from localStorage
   res.json({ message: 'Logged out successfully' })
})

export default router 