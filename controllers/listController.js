import List from "../models/List.js";
import Board from "../models/Board.js";

// ✅ Create new list under a board
export const createList = async (req, res) => {
  try {
    const { boardId, title } = req.body;

    if (!boardId || !title)
      return res.status(400).json({ message: "Board ID and title required" });

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const list = new List({ title, boardId });
    await list.save();

    res.status(201).json({ message: "List created", list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all lists in a board
export const getListsByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const lists = await List.find({ boardId }).sort({ position: 1 });
    res.json({ lists });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update list title
export const updateList = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const updated = await List.findByIdAndUpdate(
      id,
      { title },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "List not found" });

    res.json({ message: "List updated", list: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete a list
export const deleteList = async (req, res) => {
  try {
    const { id } = req.params;
    const list = await List.findById(id);

    if (!list) return res.status(404).json({ message: "List not found" });

    await list.deleteOne();
    res.json({ message: "List deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
