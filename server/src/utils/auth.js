const { AuthenticationError } = require('apollo-server-express');

const validateUser = (user) => {
  if (!user) {
    throw new AuthenticationError('You must be logged in to perform this action');
  }
  return true;
};

const validateRole = (user, requiredRole) => {
  if (!user) {
    throw new AuthenticationError('You must be logged in to perform this action');
  }
  if (user.role !== requiredRole) {
    throw new AuthenticationError('You do not have permission to perform this action');
  }
  return true;
};

const validateOwnership = (user, resourceUserId) => {
  if (!user) {
    throw new AuthenticationError('You must be logged in to perform this action');
  }
  if (user._id.toString() !== resourceUserId.toString()) {
    throw new AuthenticationError('You do not have permission to access this resource');
  }
  return true;
};

module.exports = {
  validateUser,
  validateRole,
  validateOwnership
}; 