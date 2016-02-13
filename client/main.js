/////
// Routing
/////

Router.configure({
    layoutTemplate: "ApplicationTemplate"
});

Router.route('/', function() {
    this.render('navbar', {
        to: "navbar"
    });
    this.render('welcomen', {
        to: "welcome_message"
    });
    this.render('website_form', {
        to: "add_weburl"
    });
    this.render('website_list', {
        to: "main"
    });
});

Router.route('/comments/:_id', function() {
    this.render('navbar', {
        to: "navbar"
    });
    this.render('comments', {
        to: "main",
        data: function() {
            return Websites.findOne({
                _id: this.params._id
            });
        }
    });
    this.render('website_add_comment', {
        to: "website_add_comment"
    });
});

Router.route('/recommendations', function() {
    this.render('navbar', {
        to: "navbar"
    });
    this.render('recommendations_list', {
        to: "main"
    });
});

Template.notifications.onCreated(function () {
  // Use this.subscribe inside onCreated callback
  this.subscribe("notifications");
});

/////
// infinitescroll
/////

Session.set("urlsLimit", 8);

lastScrollTop = 0;
$(window).scroll(function(event) {
    // test if we are near the bottom of the window
    if ($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
        // where are we in the page? 
        var scrollTop = $(this).scrollTop();
        // test if we are going down
        if (scrollTop > lastScrollTop) {
            // yes we are heading down...
            Session.set("urlsLimit", Session.get("urlsLimit") + 4);
        }

        lastScrollTop = scrollTop;
    }

})

/////
/// Accounts config
/////

Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
});

/////
// template helpers 
/////

Template.registerHelper('formattedDate', function(createdOn) {
    if (!createdOn) return '';
    return createdOn.toLocaleDateString() + ' ' + createdOn.toLocaleTimeString();
});

Template.registerHelper('isVoted', function(voters) {
    return !Meteor.user() || voters.indexOf(Meteor.user()._id) > -1;
});

Template.registerHelper('getUserName', function(id) {
    return Meteor.users.findOne({
        _id: id
    }).username;
});

Template.welcomen.helpers({
    welcomenMessage: function() {
        if (Meteor.user()) {
            return "Glad to see you " + Meteor.user().username + " add a new website or make a vote";
        } else {
            return "Please login or sign in to post websites and make votes.";
        }
    }
});

// helper function that returns all available websites
Template.website_list.helpers({
    websites: function() {
       	var options = { sort: { votesUp: -1 }, limit: Session.get("urlsLimit")};
    	var search_text = Session.get("search_query")
        return (!search_text) ? Websites.find({}, options) : 
                                Websites.find({ $or: [ {title: {'$regex': search_text}}, 
        										 {url: {'$regex': search_text}}, 
        										 {description: {'$regex': search_text}}
        										]});
    }
});


Template.recommendations_list.helpers({
    recommendations: function() {
        var options = { sort: { votesUp: -1 }, limit: Session.get("urlsLimit")};
        var userId = Meteor.user()._id;

        var queryFavors = Websites.find({ $or: [{ 'voters': userId }, { 'comments.user': userId }] } );
        var favors = queryFavors.map(function(website) {  return website.title;  });
        var interestedIn = '('
        for (var index in favors) 
        {
            interestedIn += favors[index];
            interestedIn += '|';
        }
        interestedIn = interestedIn.slice(0, -1);
        interestedIn += ')';

        var querySimilar = Websites.find({ $and : [ { $or: [ { title: { $regex: interestedIn, $options: "i" }}, 
                                                             { url:  { $regex: interestedIn, $options: "i" }}, 
                                                             { description: { $regex: interestedIn, $options: "i" }} ]},  
                                                    { title : { $nin: favors } }
                                        ]});

        return querySimilar;
    }
});
/////
// template events 
/////

Template.navbar.events({
	"keyup .js-search-form": function(event) {
        var search_text = $('#searchbox').val();
		Session.set("search_query", search_text);
	}
});

Template.website_item.events({
    "click .js-upvote": function(event) {
        var website_id = this._id;

        Websites.update({
            _id: website_id
        }, {
            $inc: { votesUp: 1 },
            $push: { voters: Meteor.user()._id }
        });

        return false; // prevent the button from reloading the page
    },
    "click .js-downvote": function(event) {
        var website_id = this._id;

        Websites.update({
            _id: website_id
        }, {
            $inc: { votesDown: -1 },
            $push: { voters: Meteor.user()._id }
        });

        return false; // prevent the button from reloading the page
    }
});

Template.website_form.events({
    "click .js-toggle-website-form": function(event) {
        $("#website_form").toggle('slow');
    },
    "submit .js-save-website-form": function(event) {

        // Here is an example of how to get the url out of the form:
        var url = event.target.url.value;
        Meteor.call('checkAndCorrectURL', url, function(error, result) {
            url = result;

            var title = event.target.title.value;
            var description = event.target.description.value;

            Meteor.call('getURLdescription', url, function(err, response) {

                if (!description && response)
                {
                	var htmlDom = document.createElement('html');
                	htmlDom.innerHTML = response.content;
                	var urlDescription = htmlDom.querySelector("meta[name=\'description\']");

                	if (urlDescription && urlDescription != undefined)
                	{
                		description = urlDescription.content;
                	}
                }

                // Put your website saving code in here!
                Websites.insert({
                    title: title,
                    url: url,
                    description: description,
                    createdOn: new Date(),
                    createdBy: Meteor.user()._id,
                    voters: [],
                    comments: [],
                    votesUp: 0,
                    votesDown: 0
                }, function(error, id) {
                    $("html, body").animate({ scrollTop: $("#" + id).offset().top }, 1000);
                });
                $("#website_form").toggle('slow');
            });
        });
		
        return false; // stop the form submit from reloading the page
    }
});

Template.comments.events({
    'click .js-show-addcomment-form': function(event) {
        $("#website_add_comment").modal('show');
    }
});

Template.website_add_comment.events({
    'click .js-add-comment': function(event) {

        var website_id = this._id;
        var commentText = $("#comment_form").val();
        if (Meteor.user()) {
            Websites.update({ _id: website_id }, {
                $push: {
                    comments: {
                        user: Meteor.user()._id,
                        text: commentText
                    }
                }
            });
        }
        $("#website_add_comment").modal('hide');
        return false;
    }
});
