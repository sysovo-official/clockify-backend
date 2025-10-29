import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  const user = await User.findOne({ email }).lean();
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }



  const userDoc = await User.findOne({ email });
  const isMatch = await userDoc.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, subRole: user.subRole },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subRole: user.subRole,
    },
  });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully"
  });
});

// POST /api/auth/add
export const addEmployee = asyncHandler(async (req, res) => {
  const { name, email, password, subRole } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required"
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already exists"
    });
  }

  const newUser = new User({
    name,
    email,
    password,
    role: "Employee",
    subRole: subRole || undefined,
  });

  await newUser.save();

  res.status(201).json({
    success: true,
    message: "Employee added successfully",
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      subRole: newUser.subRole,
    },
  });
});

// GET /api/auth/employees
export const getAllEmployees = asyncHandler(async (_req, res) => {
  const employees = await User.find({ role: "Employee" })
    .select("_id name email subRole createdAt")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    count: employees.length,
    employees
  });
});

// GET /api/auth/employee/:id - Get single employee with full details
export const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await User.findById(id)
    .select("-password")
    .lean();

  if (!employee || employee.role !== "Employee") {
    return res.status(404).json({
      success: false,
      message: "Employee not found"
    });
  }

  res.json({
    success: true,
    employee
  });
});

// PUT /api/auth/employee/:id - Update employee details
export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, subRole } = req.body;

  const employee = await User.findById(id);
  if (!employee || employee.role !== "Employee") {
    return res.status(404).json({
      success: false,
      message: "Employee not found"
    });
  }

  // Check if email is being changed and if it already exists
  if (email && email !== employee.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }
    employee.email = email;
  }

  if (name) employee.name = name;
  if (subRole) employee.subRole = subRole;

  await employee.save();

  res.json({
    success: true,
    message: "Employee updated successfully",
    employee: {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      subRole: employee.subRole,
    }
  });
});

// GET /api/auth/department-stats - Get statistics by department/subrole
export const getDepartmentStats = asyncHandler(async (_req, res) => {
  const stats = await User.aggregate([
    {
      $match: { role: "Employee" }
    },
    {
      $group: {
        _id: "$subRole",
        count: { $sum: 1 },
        employees: {
          $push: {
            id: "$_id",
            name: "$name",
            email: "$email",
            createdAt: "$createdAt"
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const total = stats.reduce((sum, dept) => sum + dept.count, 0);

  res.json({
    success: true,
    totalEmployees: total,
    departments: stats.map(dept => ({
      name: dept._id || "Unassigned",
      count: dept.count,
      percentage: total > 0 ? Math.round((dept.count / total) * 100) : 0,
      employees: dept.employees
    }))
  });
});

// DELETE /api/auth/employee/:id
export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Employee ID is required"
    });
  }

  const deletedUser = await User.findByIdAndDelete(id);
  if (!deletedUser) {
    return res.status(404).json({
      success: false,
      message: "Employee not found"
    });
  }

  res.json({
    success: true,
    message: "Employee deleted successfully"
  });
});

// PUT /api/auth/employee/:id/change-password - Admin changes employee password
export const changeEmployeePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  // Verify the requester is CEO/Admin
  if (req.user.role !== "CEO") {
    return res.status(403).json({
      success: false,
      message: "Only admin can change employee passwords"
    });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long"
    });
  }

  const employee = await User.findById(id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found"
    });
  }

  // Update password
  employee.password = newPassword;
  await employee.save();

  res.json({
    success: true,
    message: `Password updated successfully for ${employee.name}`
  });
});


