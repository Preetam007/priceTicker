exports = module.exports = function(app, mongoose) {
    'use strict';

    var userSchema = new mongoose.Schema(
        {
            email: { type: String },
            name : {
                first : { type : String },
                last : { type : String}
            },
            uid : { type : String , unique: true},
            alerts :  {
                //Custom alert generator (Example: which coin to buy and when to sell)
                signals : { type : Boolean , default: false},
                // ICO Watchlist (Curated list with credible ICOs and metrics like soft cap, hard cap, etc)
                icowatchlist : { type : Boolean , default : false },
                // Full agenda with releases and roadmap updates for main coins
                releasesroadmap : { type : Boolean , default :false}
            },
            lastLogin : {type : Date,default : new Date()}
        },
        {
            timestamps: { createdAt: 'created_at' , updatedAt : 'updated_at' }
        }
    );

    // per page user id is different ..
    userSchema.index({ uid: 1 });
    
    userSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('User', userSchema);
};
