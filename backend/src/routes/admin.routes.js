const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { authenticate, authorize } = require("../middleware/auth");
const User = require("../models/User");
const { sendInvitationEmail } = require("../utils/mailer");

// Valid roles for assignment
const VALID_ROLES = ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN", "ADMIN"];

// Tunisia Governorates and their municipalities
const TUNISIA_GEOGRAPHY = {
  Ariana: ["Ariana", "Raoued", "Sidi Thabet", "La Soukra", "Ettadhamen", "Mnihla", "Kalaat El Andalous", "Sidi Ameur"],
  Béja: ["Béja", "Medjez El Bab", "Nefza", "Teboursouk", "Testour", "Mateur", "Joumine", "El Ma El Abiod"],
  "Ben Arous": ["Ben Arous", "Radès", "Mornag", "Hammam Lif", "Hammam Chott", "Ezzahra", "Mourouj", "Borj Cédria", "Méryana"],
  Bizerte: ["Bizerte", "Mateur", "Ras Jebel", "Sejnane", "Menzel Bourguiba", "Tinja", "El Alia", "Ghar El Melh", "Aousja"],
  Gabès: ["Gabès", "Mareth", "El Hamma", "Métouia", "Oudhref", "Ghannouch", "Kébili", "Degache", "Tamazret", "Zarat"],
  Gafsa: ["Gafsa", "Métlaoui", "El Ksar", "Sidi Aïch", "Ouedhref", "Moularès", "Haidra", "Sened", "El Guettar"],
  Jendouba: ["Jendouba", "Tabarka", "Aïn Draham", "Balta", "Bou Salem", "Fernana", "Ghardimaou", "Oued Meliz", "Joumine"],
  Kairouan: ["Kairouan", "Sousse", "Kairouan Nord", "Kairouan Sud", "Oueslatia", "Bougarnane", "Sidi Jaber", "Haffouz", "Hajeb El Ayoun"],
  Kasserine: ["Kasserine", "Sbeitla", "Thala", "Kairouan", "Feriana", "Fériana", "Sbiba", "Djedeliane", "Aïn Khoucha"],
  Kébili: ["Kébili", "Douz", "Kébili Nord", "Kébili Sud", "Razzeg", "Béchari", "El Golâa", "Souk Lahad"],
  "Le Kef": ["Le Kef", "Sakiet Sidi Youssef", "Tajerouine", "Menzel Salem", "Bouchemma", "El Krib", "Dahmani", "Masks:oussal", "Bargou"],
  Mahdia: ["Mahdia", "Sfax", "Mahdia Ville", "Ksour Essef", "Melloulèche", "Ouedhref", "Sidi Alouane", "El Djem", "Chebba"],
  Manouba: ["Manouba", "Den Den", "Mornaguia", "Ouedhref", "Borj El Amri", "Jedaida", "Menzel Mahfoudh", "Tabarja"],
  Médenine: ["Médenine", "Djerba", "Midoun", "Houmt Souk", "Sfax", "Beni Khedache", "Zarzis", "Ben Gardane", "Ajim"],
  Monastir: ["Monastir", "Sousse", "Monastir Ville", "Skanès", "Mahdia", "Ksar Hellal", "Moknine", "Bembla", "Beni Hassen"],
  Nabeul: ["Nabeul", "Hammamet", "Sousse", "Sidi Thabet", "Kairouan", "Kelibia", "Menzel Temime", "Dar Chaâbane", "Beni Khiar"],
  Sfax: ["Sfax", "Sfax Ville", "Sfax Sud", "Sfax Nord", "Thyna", "Chihia", "Jedeni", "Menzel Chaker", "Agareb"],
  "Sidi Bouzid": ["Sidi Bouzid", "Menzel Bouzaiane", "Sidi Ali Ben Aoun", "Ouled Haffouz", "Melloulèche", "Bir El Hafey", "Sahline"],
  Siliana: ["Siliana", "Bousalem", "El Krib", "Bargou", "Kesra", "Makthar", "Bou Arada", "Sidi Morocco", "Gaâfour"],
  Sousse: ["Sousse", "Sousse Ville", "Ksibet Thrayet", "Msaken", "Sidi Bou Ali", "Hammam Sousse", "Kantaoui", "Kalâa Kebira"],
  Tataouine: ["Tataouine", "Tataouine Nord", "Tataouine Sud", "Ghomrassen", "Dhehiba", "Remada", "El Ferch", "Smar"],
  Tozeur: ["Tozeur", "Nefta", "Degache", "Tameghza", "El Hamma du Jérid", "Kebili"],
  Tunis: ["Tunis", "Tunis Ville", "Cité El Khadra", "El Ouardia", "El Menzah", "Bhar Lazreg", "Le Bardo", "Sidi Hassine", "Jebel Jelloud"],
  Zaghouan: ["Zaghouan", "Zaghouan Ville", "Nadhour", "Bir Mcherga", "Zriba", "El Amaiem", "Fountain", "Jedaida"]
};

/**
 * Helper function to format user response (excludes sensitive data)
 */
const formatUserResponse = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isActive: user.isActive,
  isVerified: user.isVerified,
  governorate: user.governorate,
  municipality: user.municipality,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Helper function to send error response
 */
const sendError = (res, status, message) => {
  return res.status(status).json({ success: false, message });
};

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (paginated)
 * @access  Admin only
 */
router.get("/users", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(searchQuery),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map(formatUserResponse),
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
    sendError(res, 500, "Failed to fetch users");
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user by ID
 * @access  Admin only
 */
router.get("/users/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return sendError(res, 404, "Utilisateur non trouvé");
    }

    res.json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    sendError(res, 500, "Failed to fetch user");
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (without password - magic link will be sent)
 * @access  Admin only
 */
router.post("/users", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { fullName, email, role, phone, governorate, municipality } = req.body;

    // Validate required fields (NO password required)
    if (!fullName || !email) {
      return sendError(res, 400, "Le nom complet et l'email sont requis");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 400, "Format d'email invalide");
    }

    // Validate phone format (Tunisian phone number)
    if (phone) {
      // Remove any spaces or dashes
      const cleanPhone = phone.replace(/[\s-]/g, "");
      // Tunisian phone: starts with +216 or 216, or just 8 digits starting with 2, 4, 5, 9
      const phoneRegex = /^(\+216|216)?[2459]\d{7}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return sendError(res, 400, "Format de téléphone invalide. Exemple: +21629123456 ou 29123456");
      }
    }

    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
      return sendError(res, 400, "Rôle invalide");
    }

    // Validate governorate if provided (for agents, technicians, managers)
    const rolesRequiringMunicipality = ["MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN"];
    if (role && rolesRequiringMunicipality.includes(role)) {
      if (!governorate) {
        return sendError(res, 400, "Le gouvernorat est requis pour ce rôle");
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 409, "Un utilisateur avec cet email existe déjà");
    }

    // Check if fullName already exists
    const existingName = await User.findOne({ fullName: { $regex: new RegExp(`^${fullName}$`, "i") } });
    if (existingName) {
      return sendError(res, 409, "Un utilisateur avec ce nom existe déjà");
    }

    // Generate invitation token (valid for 24 hours)
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (NO password - user will set it via magic link)
    const user = new User({
      fullName,
      email: email.toLowerCase(),
      password: undefined, // No password - will be set via magic link
      role: role || "CITIZEN",
      phone: phone || undefined,
      governorate: governorate || "",
      municipality: municipality || "",
      isVerified: false,
      isActive: false, // User is inactive until they activate their account
      magicToken: invitationToken,
      magicTokenExpires: invitationTokenExpires,
    });

    await user.save();

    // Send invitation email
    try {
      await sendInvitationEmail(
        email.toLowerCase(),
        email.toLowerCase(), // Use email as userId for verification
        invitationToken,
        fullName,
        role || "CITIZEN"
      );
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request if email fails, user is still created
    }

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès. Un email d'invitation a été envoyé.",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.name === "ValidationError") {
      return sendError(res, 400, error.message);
    }
    sendError(res, 500, "Échec de la création de l'utilisateur");
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 * @access  Admin only
 */
router.put("/users/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { fullName, phone, isActive, governorate, municipality } = req.body;
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (req.user.id === userId && isActive === false) {
      return sendError(res, 400, "Vous ne pouvez pas désactiver votre propre compte");
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (governorate !== undefined) updateData.governorate = governorate;
    if (municipality !== undefined) updateData.municipality = municipality;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return sendError(res, 404, "Utilisateur non trouvé");
    }

    res.json({
      success: true,
      message: "Utilisateur mis à jour avec succès",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error updating user:", error);
    sendError(res, 500, "Échec de la mise à jour de l'utilisateur");
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.put("/users/:id/role", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Validate role
    if (!role) {
      return sendError(res, 400, "Le rôle est requis");
    }

    if (!VALID_ROLES.includes(role)) {
      return sendError(res, 400, "Rôle invalide");
    }

    // Prevent admin from demoting themselves
    if (req.user.id === userId && role !== "ADMIN") {
      return sendError(res, 400, "Vous ne pouvez pas modifier votre propre rôle d'administrateur");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return sendError(res, 404, "Utilisateur non trouvé");
    }

    res.json({
      success: true,
      message: "Rôle mis à jour avec succès",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    sendError(res, 500, "Échec de la mise à jour du rôle");
  }
});

/**
 * @route   PUT /api/admin/users/:id/active
 * @desc    Toggle user active status
 * @access  Admin only
 */
router.put("/users/:id/active", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = req.params.id;

    if (typeof isActive !== "boolean") {
      return sendError(res, 400, "isActive doit être une valeur booléenne");
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === userId && !isActive) {
      return sendError(res, 400, "Vous ne pouvez pas désactiver votre propre compte");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return sendError(res, 404, "Utilisateur non trouvé");
    }

    res.json({
      success: true,
      message: `Utilisateur ${isActive ? "activé" : "désactivé"} avec succès`,
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error updating user active status:", error);
    sendError(res, 500, "Échec de la mise à jour du statut");
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user permanently
 * @access  Admin only
 */
router.delete("/users/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return sendError(res, 400, "Vous ne pouvez pas supprimer votre propre compte");
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return sendError(res, 404, "Utilisateur non trouvé");
    }

    res.json({
      success: true,
      message: "Utilisateur supprimé avec succès",
      data: { id: userId },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    sendError(res, 500, "Échec de la suppression de l'utilisateur");
  }
});

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get("/users/stats", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
        },
      },
    ]);

    const total = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        total,
        active: activeUsers,
        inactive: total - activeUsers,
        byRole: stats,
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    sendError(res, 500, "Échec de la récupération des statistiques");
  }
});

/**
 * @route   GET /api/admin/geography
 * @desc    Get Tunisia governorates and municipalities
 * @access  Admin only
 */
router.get("/geography", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    // Return governorates with their municipalities
    const geography = Object.entries(TUNISIA_GEOGRAPHY).map(([governorate, municipalities]) => ({
      governorate,
      municipalities,
    }));

    res.json({
      success: true,
      data: geography,
    });
  } catch (error) {
    console.error("Error fetching geography:", error);
    sendError(res, 500, "Échec de la récupération des données géographiques");
  }
});

module.exports = router;
