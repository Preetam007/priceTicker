exports = module.exports = function(app, mongoose) {
    'use strict';

    var userSchema = new mongoose.Schema(
        {
            email: { type: String, unique: true },
            uid : { type : String , unique: true},
            lastLogin : {type : Date,default : new Date()}
        },
        {
            timestamps: { createdAt: 'created_at' , updatedAt : 'updated_at' }
        }
    );

    userSchema.index({ email: 1 });
    userSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('User', userSchema);
};
