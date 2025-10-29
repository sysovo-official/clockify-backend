import Board from "../models/Board.js";
import User from "../models/User.js";

// ✅ Create a new board (CEO only)
export const createBoard = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) return res.status(400).json({ message: "Board name required" });

    const newBoard = new Board({
      name,
      description,
      createdBy: req.user.id,
      members: members || [], // optional: CEO can invite team members
    });

    await newBoard.save();
    res.status(201).json({ message: "Board created", board: newBoard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all boards (CEO sees all, employee sees only assigned)
export const getBoards = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    let boards;

    if (user.role === "CEO") {
      boards = await Board.find().populate("members", "name email");
    } else {
      boards = await Board.find({
        $or: [{ createdBy: userId }, { members: userId }],
      }).populate("members", "name email");
    }

    res.status(200).json({ boards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Add member to board
export const addMemberToBoard = async (req, res) => {
  try {
    const { boardId, userId } = req.body;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.members.includes(userId)) {
      return res.status(400).json({ message: "User already a member" });
    }

    board.members.push(userId);
    await board.save();

    res.json({ message: "Member added", board });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update board (CEO only)
export const updateBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: "Board name required" });

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    board.name = name;
    if (description !== undefined) board.description = description;

    await board.save();

    const updatedBoard = await Board.findById(id).populate("members", "name email");
    res.json({ message: "Board updated successfully", board: updatedBoard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete board (CEO only)
export const deleteBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const board = await Board.findById(id);

    if (!board) return res.status(404).json({ message: "Board not found" });

    await board.deleteOne();
    res.json({ message: "Board deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
