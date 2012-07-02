function wpac_extractBody(html) {
	var regex = new RegExp("<body[^>]*>((.|\n|\r)*)</body>", "i");
	return jQuery("<div>"+regex.exec(html)[1]+"</div>");
}

function wpac_showMessage(message, type) {

	var top = 10;
	var wpAdminBar = jQuery("#wpadminbar")[0];
	if (wpAdminBar) {
		top += jQuery(wpAdminBar).outerHeight();
	}

	var backgroundColor = "#000";
	if (type == "error") backgroundColor = "#f00";
	if (type == "success") backgroundColor = "#008000";
	
	jQuery.blockUI({ 
		message: message, 
		fadeIn: 400, 
		fadeOut: 400, 
		timeout: (type == "loading") ? 0 : 3000,
		centerY: false,
		centerX: true,
		showOverlay: (type == "loading"),
		css: { 
			top: top + 'px',
			right: '10px', 
			border: 'none', 
			padding: '5px', 
			backgroundColor: backgroundColor, 
			'-webkit-border-radius': wpac_options.popupCornerRadius + "px",
			'-moz-border-radius': wpac_options.popupCornerRadius + "px",
			'border-radius': wpac_options.popupCornerRadius + "px",
			opacity: .7, 
			color: '#fff' 
		},
		overlayCSS:  { 
			backgroundColor: '#000', 
			opacity: 0
		}
	}); 
}

var wpac_debug_errorShown = false;
function wpac_debug(level, message) {

	if (typeof window["console"] === "undefined" || typeof window["console"][level] === "undefined" || typeof window["console"][level].apply === "undefined") {
		if (!wpac_debug_errorShown) alert("console object is undefined or is not supported, debugging wp-ajaxify-comments is disabled! Please use Firebug or Google Chrome for debugging wp-ajaxify-comments.");
		wpac_debug_errorShown = true;
		return;
	}

	var args = jQuery.merge(["[WP-Ajaxify-Comments] " + message], jQuery.makeArray(arguments).slice(2));
	console[level].apply(console, args);
}

function wpac_test_selector(elementType, selector) {
	var element = jQuery(selector);
	if (element.length > 0) {
		wpac_debug("info", "Search %s ('%s')... Found: %o", elementType, selector, element);
	} else {
		wpac_debug("error", "Search %s ('%s')... Not found", elementType, selector);
	}
}

function wpac_fallback(commentUrl) {
	wpac_showMessage(wpac_options["textReloadPage"], "loading");
	if (commentUrl) {
		location.href = commentUrl.replace("#", "&t=" + (new Date()).getTime() + "#");
	} else {
		location.reload();
	}
}

jQuery(document).ready(function() {

	// Debug infos
	if (wpac_options.debug) wpac_debug("info", "Initializing (Version: %s)", wpac_options.version);

	// Skip initialization if comments are not allowed
	if (!wpac_options.commentsAllowed) {
		if (wpac_options.debug) {
			wpac_debug("info", "Abort initialization (comments are not allowed on current page)");
		}
		return;
	}

	// Debug infos
	if (wpac_options.debug) {
		wpac_debug("info", "Search jQuery... Found: %s", jQuery.fn.jquery);
		wpac_test_selector("comment form", wpac_options.selectorCommentForm);
		wpac_test_selector("comments container", wpac_options.selectorCommentsContainer);
		wpac_test_selector("respond container", wpac_options.selectorRespondContainer);
		wpac_debug("info", "Initialization complete");
	}
	
	// Intercept comment form submit
	jQuery(wpac_options["selectorCommentForm"]).live("submit", function (event) {

		var form = jQuery(this);

		// Stop default event handling
		event.preventDefault();
	
		// Show loading info
		wpac_showMessage(wpac_options["textLoading"], "loading");
	  
		var request = jQuery.ajax({
			url: form.attr('action'),
			type: "POST",
			data: form.serialize(),
			success: function (data) {

				var extractedBody = wpac_extractBody(data);
				var newCommentsContainer = extractedBody.find(wpac_options.selectorCommentsContainer);
				var oldCommentsContainer = jQuery(wpac_options.selectorCommentsContainer);

				var commentUrl = request.getResponseHeader('X-WPAC-URL');
				
				if (oldCommentsContainer.length == 0 || newCommentsContainer.length == 0) return wpac_fallback(commentUrl);

				// Show success message
				wpac_showMessage(wpac_options["textPosted"], "success");
			
				// Update comments container
				oldCommentsContainer.replaceWith(newCommentsContainer);
				
				if (jQuery(wpac_options.selectorCommentForm).length == 0) {

					// "Re-inject" comment form, if comment form was removed by updating the comments container; could happen 
					// if theme support threaded/nested comments and form tag is not nested in comments container
					// -> Replace Wordpress placeholder div (#wp-temp-form-div) with respond div
					var wpTempFormDiv = jQuery("#wp-temp-form-div");
					var newRespondContainer = extractedBody.find(wpac_options.selectorRespondContainer);
					if (wpTempFormDiv.length == 0 || newRespondContainer.length == 0) return wpac_fallback(commentUrl);
					wpTempFormDiv.replaceWith(newRespondContainer);
					
				} else {

					// Replace comment form (for spam protection plugin compatibility) if comment form is not nested in comments container
					// If comment form is nested in comments container comment form is already replaced
					if (newCommentsContainer.find(wpac_options.selectorCommentForm).length == 0) {
						var newCommentForm = extractedBody.find(wpac_options.selectorCommentForm);
						if (newCommentForm.length == 0) return wpac_fallback(commentUrl);
						form.replaceWith(newCommentForm);
					}

				}

				// Smooth scroll to comment url and update browser url
				if (commentUrl) {
					var anchor = commentUrl.substr(commentUrl.indexOf("#"));
					if (anchor) {
						var anchorElement = jQuery(anchor)
						if (anchorElement.length > 0) {
							jQuery('html,body').animate({scrollTop: anchorElement.offset().top}, {
								duration: wpac_options.scrollSpeed,
								complete: function() { window.location.hash = anchor; }
							});
						}
					}
				}
				
			},
			error: function (jqXhr, textStatus, errorThrown) {

				if (wpac_options.debug) {
					wpac_debug("info", "Comment has not been posted");
					wpac_debug("info", "Try to extract error message with selector '%s'...", wpac_options.selectorErrorContainer);
				}
			
				// Extract error message
				var extractedBody = wpac_extractBody(jqXhr.responseText);
				var errorMessage = extractedBody.find(wpac_options.selectorErrorContainer);
				if (errorMessage.length == 0) {
					if (wpac_options.debug) {
						wpac_debug("error", "Error message could not be extracted, use error message '%s'.", wpac_options.textUnknownError);
					}
					errorMessage = wpac_options.textUnknownError;
				} else {
					errorMessage = errorMessage.html();
					if (wpac_options.debug) {
						wpac_debug("info", "Error message '%s' successfully extracted", errorMessage);
					}
				}
				
				wpac_showMessage(errorMessage, "error");
			}
  	    });
	  
	});

});