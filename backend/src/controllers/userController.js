const crypto = require("crypto");
const User = require("../models/User");
const Department = require("../models/Department");
const Municipality = require("../models/Municipality");
const { sendMagicLinkEmail } = require("../utils/mailer");

// Tunisia Governorates and their municipalities
const TUNISIA_GEOGRAPHY = {
  Ariana: ["Ariana", "Raoued", "Sidi Thabet", "La Soukra", "Ettadhamen", "Mnihla", "Kalaat El Andalous", "Sidi Ameur"],
  Béja: ["Béja", "Medjez El Bab", "Nefza", "Teboursouk", "Testour", "Mateur", "Joumine", "El Ma El Abiod"],
  "Ben Arous": ["Ben Arous", "Radès", "Mornag", "Hammam Lif", "Hammam Chott", "Ezzahra", "Mourouj", "Borj Cédria", "Méryana"],
  Bizerte: ["Bizerte", "Mateur", "Ras Jebel", "Sejnane", "Menzel Bourguiba", "Tinja", "El Alia", "Ghar El Melh", "Aousja"],
  Gabès: ["Gabès", "Mareth", "El Hamma", "Métouia", "Oudhref", "Ghannouch", "Kébili", "Degache", "Tamazret", "Zarat"],
  Gafsa: ["Gafsa", "Métlaoui", "El Ksar", "Sidi Aïch", "Ouedhref", "Moularès", "Haidra", "Sened", "El Guettar"],
  Jendouba: ["Jendouba", "Tabarka", "Aïn Draham", "Balta", "Bou Salem", "Fernana", "Ghardimaou", "Oued Meliz", "Joumine"],
  Kairouan: ["Kairouan", "Kairouan Nord", "Kairouan Sud", "Oueslatia", "Bougarnane", "Sidi Jaber", "Haffouz", "Hajeb El Ayoun"],
  Kasserine: ["Kasserine", "Sbeitla", "Thala", "Feriana", "Fériana", "Sbiba", "Djedeliane", "Aïn Khoucha"],
  Kébili: ["Kébili", "Douz", "Kébili Nord", "Kébili Sud", "Razzeg", "Béchari", "El Golâa", "Souk Lahad"],
  "Le Kef": ["Le Kef", "Sakiet Sidi Youssef", "Tajerouine", "Menzel Salem", "Bouchemma", "El Krib", "Dahmani", "Makthar", "Bargou"],
  Mahdia: ["Mahdia", "Ksour Essef", "Melloulèche", "Ouedhref", "Sidi Alouane", "El Djem", "Chebba"],
  Manouba: ["Manouba", "Den Den", "Mornaguia", "Ouedhref", "Borj El Amri", "Jedaida", "Menzel Mahfoudh", "Tabarja"],
  Médenine: ["Médenine", "Djerba", "Midoun", "Houmt Souk", "Beni Khedache", "Zarzis", "Ben Gardane", "Ajim"],
  Monastir: ["Monastir", "Monastir Ville", "Skanès", "Ksar Hellal", "Moknine", "Bembla", "Beni Hassen"],
  Nabeul: ["Nabeul", "Hammamet", "Kelibia", "Menzel Temime", "Dar Chaâbane", "Beni Khiar"],
  Sfax: ["Sfax", "Sfax Ville", "Sfax Sud", "Sfax Nord", "Thyna", "Chihia", "Jedeni", "Menzel Chaker", "Agareb"],
  "Sidi Bouzid": ["Sidi Bouzid", "Menzel Bouzaiane", "Sidi Ali Ben Aoun", "Ouled Haffouz", "Melloulèche", "Bir El Hafey", "Sahline"],
  Siliana: ["Siliana", "Bousalem", "El Krib", "Bargou", "Kesra", "Makthar", "Bou Arada", "Sidi Morocco", "Gaâfour"],
  Sousse: ["Sousse", "Sousse Ville", "Ksibet Thrayet", "Msaken", "Sidi Bou Ali", "Hammam Sousse", "Kantaoui", "Kalâa Kebira"],
  Tataouine: ["Tataouine", "Tataouine Nord", "Tataouine Sud", "Ghomrassen", "Dhehiba", "Remada", "El Ferch", "Smar"],
  Tozeur: ["Tozeur", "Nefta", "Degache", "Tameghza", "El Hamma du Jérid", "Kebili"],
  Tunis: ["Tunis", "Tunis Ville", "Cité El Khadra", "El Ouardia", "El Menzah", "Bhar Lazreg", "Le Bardo", "Sidi Hassine", "Jebel Jelloud"],
  Zaghouan: ["Zaghouan", "Zaghouan Ville", "Nadhour", "Bir Mcherga", "Zriba", "El Amaiem", "Fountain", "Jedaida"]
};

// Valid roles for assignment
const VALID_ROLES = ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN", "ADMIN"];

/**
 * Helper function to format user response (excludes sensitive data)
 */
const formatUserResponse = async (user) => {
  let department = null;
  let municipality = null;
  
  // Populate department if exists
  if (user.department) {
    try {
      const dept = await Department.findById(user.department).lean();
      if (dept) {
        department = { _id: dept._id.toString(), name: dept.name };
      }
    } catch (e) {
      // Ignore populate errors
    }
  }
  
  // Populate municipality if exists
  if (user.municipality) {
    try {
      const mun = await Municipality.findById(user.municipality).lean();
      if (mun) {
        municipality = { _id: mun._id.toString(), name: mun.name, governorate: mun.governorate };
      }
    } catch (e) {
      // Ignore populate errors
    }
  }
  
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    isVerified: user.isVerified,
    governorate: user.governorate,
    municipality: municipality || (user.municipalityName ? { name: user.municipalityName } : null),
    municipalityName: user.municipalityName,
    department: department,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

class UserController {
  // Get all users (paginated)
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search || "";
      const role = req.query.role || "";
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

      // Build search query
      const searchQuery = {};
      
      if (search) {
        // escape regex metacharacters to prevent ReDoS/injection
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        searchQuery.$or = [
          { fullName: { $regex: safe, $options: "i" } },
          { email: { $regex: safe, $options: "i" } },
        ];
      }

      if (role) {
        searchQuery.role = role;
      }

      if (isActive !== undefined) {
        searchQuery.isActive = isActive;
      }

      const [users, total] = await Promise.all([
        User.find(searchQuery)
          .select("-password -refreshToken")
          .populate('municipality', 'name governorate')
          .populate('department', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(searchQuery),
      ]);

      res.json({
        success: true,
        data: {
          users: await Promise.all(users.map(formatUserResponse)),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  }

  // Get single user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id)
        .select("-password -refreshToken")
        .populate('municipality', 'name governorate')
        .populate('department', 'name');

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const formattedUser = await formatUserResponse(user);
      res.json({
        success: true,
        data: formattedUser,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user" });
    }
  }

  // Create new user (admin function)
  async createUser(req, res) {
    try {
      const { fullName, email, role, phone, governorate, municipality, municipalityId, department } = req.body;

      // Validate required fields
      if (!fullName || !email) {
        return res.status(400).json({ success: false, message: "Full name and email are required" });
      }

      // Validate fullName minimum 3 characters
      if (fullName.length < 3) {
        return res.status(400).json({ success: false, message: "Full name must be at least 3 characters" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalizedEmail = email.toLowerCase().trim();
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "User with this email already exists" });
      }

      // Validate role
      const userRole = role && VALID_ROLES.includes(role) ? role : "CITIZEN";

      // Validate governorate if provided
      if (governorate && !Object.keys(TUNISIA_GEOGRAPHY).includes(governorate)) {
        return res.status(400).json({ success: false, message: "Invalid governorate" });
      }

      // Validate municipality if provided
      if (municipality && governorate) {
        const municipalities = TUNISIA_GEOGRAPHY[governorate] || [];
        if (!municipalities.includes(municipality)) {
          return res.status(400).json({ success: false, message: "Invalid municipality for selected governorate" });
        }
      }

      // Validate department if provided
      let departmentId = null;
      if (department) {
        const dept = await Department.findById(department);
        if (!dept) {
          return res.status(400).json({ success: false, message: "Invalid department" });
        }
        departmentId = department;
      }

      // Generate magic token for password setup
      const magicToken = crypto.randomBytes(32).toString('hex');
      const magicTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

      // Create user without password (will be set via magic link)
      const user = new User({
        fullName,
        email: normalizedEmail,
        phone: phone || null,
        role: userRole,
        department: departmentId,
        governorate: governorate || "",
        municipality: municipalityId || null,
        municipalityName: municipality || "",
        isVerified: true, // Admin-created users are verified by default
        magicToken,
        magicTokenExpires,
      });

      await user.save();

      // Send invitation email with magic link
      try {
        await sendMagicLinkEmail(user.email, user.email, magicToken, fullName);
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        success: true,
        message: "User created successfully. Invitation email sent.",
        data: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ success: false, message: "Failed to create user" });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { fullName, email, role, phone, governorate, municipality, municipalityId, isActive, department } = req.body;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Update fields
      if (fullName) {
        if (fullName.length < 3) {
          return res.status(400).json({ success: false, message: "Full name must be at least 3 characters" });
        }
        user.fullName = fullName;
      }

      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
          return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        
        // Check if email is taken by another user
        const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
        if (existingUser) {
          return res.status(400).json({ success: false, message: "Email already in use" });
        }
        
        user.email = normalizedEmail;
      }

      if (role && VALID_ROLES.includes(role)) {
        // only admins may change another user's role
        if (req.user.role !== "ADMIN") {
          return res.status(403).json({ success: false, message: "Not authorized to change role" });
        }
        user.role = role;
      }

      if (phone !== undefined) {
        user.phone = phone;
      }

      if (governorate !== undefined) {
        if (governorate && !Object.keys(TUNISIA_GEOGRAPHY).includes(governorate)) {
          return res.status(400).json({ success: false, message: "Invalid governorate" });
        }
        user.governorate = governorate;
      }

      if (municipality !== undefined || municipalityId !== undefined) {
        // if user provided municipality but no governorate available at all, reject
        if (municipality && !governorate && !user.governorate) {
          return res.status(400).json({ success: false, message: "Governorate required when specifying municipality" });
        }
        if (governorate || user.governorate) {
          const gov = governorate || user.governorate;
          const municipalities = TUNISIA_GEOGRAPHY[gov] || [];
          if (municipality && !municipalities.includes(municipality)) {
            return res.status(400).json({ success: false, message: "Invalid municipality for selected governorate" });
          }
        }
        // Use municipalityId if provided, otherwise keep the string for backward compatibility
        if (municipalityId) {
          user.municipality = municipalityId;
          user.municipalityName = municipality || "";
        } else if (municipality !== undefined) {
          user.municipalityName = municipality;
        }
      }

      // Handle department update
      if (department !== undefined) {
        if (department) {
          const dept = await Department.findById(department);
          if (!dept) {
            return res.status(400).json({ success: false, message: "Invalid department" });
          }
          user.department = department;
        } else {
          user.department = null;
        }
      }

      if (isActive !== undefined) {
        user.isActive = isActive;
      }

      await user.save();

      res.json({
        success: true,
        message: "User updated successfully",
        data: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ success: false, message: "Failed to update user" });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.user.userId) {
        return res.status(400).json({ success: false, message: "Cannot delete your own account" });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Prevent deletion of admin users
      if (user.role === "ADMIN") {
        return res.status(400).json({ success: false, message: "Cannot delete admin users" });
      }

      await User.findByIdAndDelete(id);

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ success: false, message: "Failed to delete user" });
    }
  }

  // Toggle user active status (original method)
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // Prevent self-deactivation
      if (id === req.user.userId) {
        return res.status(400).json({ success: false, message: "Cannot change your own status" });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Prevent deactivation of admin users
      if (user.role === "ADMIN" && isActive === false) {
        return res.status(400).json({ success: false, message: "Cannot deactivate admin users" });
      }

      user.isActive = isActive;
      await user.save();

      res.json({
        success: true,
        message: isActive ? "User activated successfully" : "User deactivated successfully",
        data: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ success: false, message: "Failed to toggle user status" });
    }
  }

  // Update user role (for /users/:id/role endpoint)
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
      }

      // only admins can modify roles
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Not authorized to change roles" });
      }

      if (req.user.userId === id) {
        return res.status(403).json({ success: false, message: "Cannot change your own role" });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      user.role = role;
      await user.save();

      res.json({
        success: true,
        message: "User role updated successfully",
        data: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ success: false, message: "Failed to update user role" });
    }
  }

  // Toggle user active (for /users/:id/active endpoint)
  async toggleUserActive(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // Prevent self-deactivation
      if (id === req.user.userId) {
        return res.status(400).json({ success: false, message: "Cannot change your own status" });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Prevent deactivation of admin users
      if (user.role === "ADMIN" && isActive === false) {
        return res.status(400).json({ success: false, message: "Cannot deactivate admin users" });
      }

      user.isActive = isActive;
      await user.save();

      res.json({
        success: true,
        message: isActive ? "User activated successfully" : "User deactivated successfully",
        data: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Error toggling user active status:", error);
      res.status(500).json({ success: false, message: "Failed to toggle user active status" });
    }
  }

  // Get user statistics
  async getStats(req, res) {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const verifiedUsers = await User.countDocuments({ isVerified: true });

      const usersByRole = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]);

      const usersByGovernorate = await User.aggregate([
        { $match: { governorate: { $ne: "" } } },
        { $group: { _id: "$governorate", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const recentUsers = await User.find()
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        data: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          byRole: usersByRole.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byGovernorate: usersByGovernorate.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          recent: recentUsers.map(formatUserResponse),
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch statistics" });
    }
  }

  // Get Tunisia geography data (for frontend dropdowns)
  async getGeography(req, res) {
    try {
      res.json({
        success: true,
        data: TUNISIA_GEOGRAPHY,
      });
    } catch (error) {
      console.error("Error fetching geography:", error);
      res.status(500).json({ success: false, message: "Failed to fetch geography data" });
    }
  }

  // Search municipalities by governorate
  async getMunicipalities(req, res) {
    try {
      const { governorate } = req.params;

      if (!governorate || !TUNISIA_GEOGRAPHY[governorate]) {
        return res.status(400).json({ success: false, message: "Invalid governorate" });
      }

      res.json({
        success: true,
        data: TUNISIA_GEOGRAPHY[governorate],
      });
    } catch (error) {
      console.error("Error fetching municipalities:", error);
      res.status(500).json({ success: false, message: "Failed to fetch municipalities" });
    }
  }

  // Get all departments
  async getDepartments(req, res) {
    try {
      const departments = await Department.find().sort({ name: 1 });
      res.json({
        success: true,
        data: departments.map(d => ({
          _id: d._id,
          name: d.name,
          description: d.description,
          email: d.email,
          phone: d.phone,
        })),
      });
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ success: false, message: "Failed to fetch departments" });
    }
  }
}

const controllerInstance = new UserController();
module.exports = controllerInstance;
// expose geography map for other modules
module.exports.TUNISIA_GEOGRAPHY = TUNISIA_GEOGRAPHY;
