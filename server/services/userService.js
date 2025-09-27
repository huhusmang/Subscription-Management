const BaseRepository = require('../utils/BaseRepository');
const logger = require('../utils/logger');

class UserService extends BaseRepository {
    constructor(db) {
        super(db, 'users');
    }

    getByUsername(username) {
        try {
            return this.findOne({ username });
        } catch (error) {
            logger.error('Failed to fetch user by username:', error.message);
            throw error;
        }
    }

    createUser(userData) {
        try {
            const timestamp = new Date().toISOString();
            const data = {
                created_at: timestamp,
                updated_at: timestamp,
                role: 'admin',
                ...userData,
            };
            return this.create(data);
        } catch (error) {
            logger.error('Failed to create user:', error.message);
            throw error;
        }
    }

    updatePasswordHash(username, passwordHash) {
        try {
            const updates = {
                password_hash: passwordHash,
                updated_at: new Date().toISOString(),
            };
            return this.updateWhere({ username }, updates);
        } catch (error) {
            logger.error('Failed to update user password hash:', error.message);
            throw error;
        }
    }

    recordLastLogin(username) {
        try {
            const updates = {
                last_login_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            return this.updateWhere({ username }, updates);
        } catch (error) {
            logger.error('Failed to record last login:', error.message);
            throw error;
        }
    }
}

module.exports = UserService;
