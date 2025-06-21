import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";
import 'dotenv/config'

export const UpdateProfile = async (req, res) => {
  try {
    const { fullName, profilePic, bio, userName } = req.body;

    const updateData = {};

    if (userName) {
      const existingUser = await User.findOne({
        userName: userName,
        _id: { $ne: req.user._id }, // exclude current user
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already taken by another user",
        });
      }

      updateData.userName = userName;
    }

    if (fullName) updateData.fullName = fullName;
    if (bio) updateData.bio = bio;
    if (profilePic) updateData.profilePic = profilePic;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });

  } catch (error) {
    console.log("Error in update profile controller", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error in update profile controller",
    });
  }
};

export const UserFollow = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const targetUserId = req.body.userId;

    if (userId === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.followRequests.some(id => id.toString() === userId)) {
      return res.status(400).json({ message: "Follow request already sent" });
    }

    if (user.following.some(id => id.toString() === targetUserId)) {
      return res.status(400).json({ message: "You already follow this user" });
    }

    const userFollowingStr = user.following.map(id => id.toString());
    const targetFollowingStr = targetUser.following.map(id => id.toString());
    const followRequestsStr = targetUser.followRequests.map(id => id.toString());

    if (userFollowingStr.includes(targetUserId) && targetFollowingStr.includes(userId)) {
      return res.status(400).json({ message: "You are already mutual followers" });
    }

    if (followRequestsStr.includes(userId)) {
      return res.status(400).json({ message: "Follow request already sent" });
    }

    targetUser.followRequests.push(userId);
    await targetUser.save();

    return res.status(200).json({ message: "Follow request sent" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptFollowRequest = async (req, res) => {
  try {
    const userId = req.user._id;               // Logged-in user (target)
    const requesterId = req.body.userId;       // Request bhejne wala

    const user = await User.findById(userId);
    const requester = await User.findById(requesterId);

    if (!user.followRequests.includes(requesterId)) {
      return res.status(400).json({ message: "No such follow request" });
    }

    // Remove request
    user.followRequests = user.followRequests.filter(
      id => id.toString() !== requesterId
    );

    // ✅ Add to followers/following only if not already present
    if (!user.followers.some(id => id.toString() === requesterId)) {
      user.followers.push(requesterId);
    }

    if (!user.following.some(id => id.toString() === requesterId)) {
      user.following.push(requesterId);
    }

    if (!requester.followers.some(id => id.toString() === userId)) {
      requester.followers.push(userId);
    }

    if (!requester.following.some(id => id.toString() === userId)) {
      requester.following.push(userId);
    }

    await Promise.all([user.save(), requester.save()]);

    return res.status(200).json({
      message: "Follow request accepted, now mutual followers",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const UserUnFollow = async(req,res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.body.userId;

    if (userId.toString() === targetUserId) {
      return res.status(400).json({ message: "You cannot unfollow yourself" });
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // LOGS
    const followingIds = user.following.map(id => id.toString());
    console.log("User Following List:", followingIds);
    console.log("Target UserId:", targetUserId);

    const isFollowing = followingIds.includes(targetUserId.toString());
    console.log("isFollowing:", isFollowing);

    if (!isFollowing) {
      return res.status(400).json({ message: "You are not following this user" });
    }

    // Remove both sides
    user.following = user.following.filter(id => id.toString() !== targetUserId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== userId.toString());

    await Promise.all([user.save(), targetUser.save()]);

    // Delete chat
    await Conversation.findOneAndDelete({
      participants: { $all: [userId, targetUserId] },
    });

    return res.status(200).json({ message: "Successfully unfollowed user" });

  } catch (error) {
    console.error("Error in unfollowUser:", error.message);
    res.status(500).json({ message: "Server error in unfollowUser" });
  }
};

export const GetFollowRequest = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("followRequests") 
      .populate("followRequests", "fullName userName profilePic");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      followRequests: user.followRequests,
    });
  } catch (error) {
    console.error("Error in GetFollowRequest:", error.message);
    return res.status(500).json({ message: "Server error in GetFollowRequest" });
  }
}

export const GetFollowingUsers = async(req,res) => {
   try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
      path: 'following',
      select: 'fullName profilePic userName ', // Jo fields chahiye wo yahan mention karo
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Following users fetched successfully",
      following: user.following,
    });

  } catch (error) {
    console.log("Error in get following users controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error in get following users controller",
    });
  }
}

export const GetUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id; 
    const searchQuery = req.query.search || "";  // URL query param: ?search=kunal

   
    const users = await User.find({
      _id: { $ne: loggedInUserId }, 
      userName: { $regex: searchQuery, $options: "i" },
    }).select("userName fullName bio profilePic"); 

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    console.error("Error in GetUsers:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error in GetUsers",
    });
  }
};

