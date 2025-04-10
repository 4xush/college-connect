import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import { createServer } from "http"
import { Server } from "socket.io"

// Routes
import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import postRoutes from "./routes/posts.js"
import pollRoutes from "./routes/polls.js"
import notificationRoutes from "./routes/notifications.js"

// Middleware
import { errorHandler } from "./middleware/errorHandler.js"
import { auth } from "./middleware/auth.js"

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 5000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure CORS for both Express and Socket.IO
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Create Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000,
})

// Attach io to app
app.set("io", io)

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  // Join user's room for private notifications
  socket.on("join", (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined their room`)
  })

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log("Client disconnected:", socket.id, "Reason:", reason)
  })

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error)
  })

  // Handle reconnection attempts
  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log("Reconnection attempt:", attemptNumber)
  })

  // Handle successful reconnection
  socket.on("reconnect", (attemptNumber) => {
    console.log("Reconnected after", attemptNumber, "attempts")
  })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/polls", pollRoutes)
app.use("/api/notifications", notificationRoutes)

// Test route
app.get("/test", async (req, res) => {
  console.log("test okay")
  res.send("Test route is working!")
})

// Error handling middleware
app.use(errorHandler)

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB")
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error)
  })

// Export io for use in other files
export { io }
