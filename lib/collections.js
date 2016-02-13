Websites = new Mongo.Collection("websites");

Meteor.methods({
	incrementVotes: function(website_id)
	{

	}
});

Websites.allow({
	insert:function(userId, doc) {
		return Meteor.user() && userId == doc.createdBy;
	},
	update:function(userId, doc, fields, modifier) {

		var willModify = function (field) {
      		return _.contains(fields, field);
    	}
		var isLoggedIn = Meteor.user();

		if (!isLoggedIn)	
			return false;

		if (willModify("comments") && fields.length === 1)
			return true;

		var isModifyLegibleFields = willModify("votesUp") || 
									willModify("votesDown") || 
									willModify("voters");

    	var wasVoted = _.contains(doc.voters, userId);
		var voteUpInc = modifier["$inc"]["votesUp"];
		var voteDownInc = modifier["$inc"]["votesDown"];

		console.log(wasVoted);

		console.log(voteUpInc);
		console.log(voteDownInc);
		
		if ((voteUpInc === 1 || voteDownInc === -1) && !wasVoted && isModifyLegibleFields)
        	return true;

		return false;
	}
});