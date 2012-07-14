function wpac_extractBody(html) {
	var regex = new RegExp("<body[^>]*>((.|\n|\r)*)</body>", "i");
	return jQuery("<div>"+regex.exec(html)[1]+"</div>");
}

function wpac_showMessage(message, type) {

	var top = wpac_options.popupMarginTop + jQuery("#wpadminbar").outerHeight();

	var backgroundColor = wpac_options.popupBackgroundColorLoading;
	var textColor = wpac_options.popupTextColorLoading;
	if (type == "error") {
		backgroundColor = wpac_options.popupBackgroundColorError;
		textColor = wpac_options.popupTextColorError;
	} else if (type == "success") {
		backgroundColor = wpac_options.popupBackgroundColorSuccess;
		textColor = wpac_options.popupTextColorSuccess;
	}
	
	jQuery.blockUI({ 
		message: message, 
		fadeIn: wpac_options.popupFadeIn, 
		fadeOut: wpac_options.popupFadeOut, 
		timeout:(type == "loading") ? 0 : wpac_options.popupTimeout,
		centerY: false,
		centerX: true,
		showOverlay: (type == "loading"),
		css: { 
			top: top + 'px',
			border: 'none', 
			padding: '5px', 
			backgroundColor: backgroundColor, 
			'-webkit-border-radius': wpac_options.popupCornerRadius + "px",
			'-moz-border-radius': wpac_options.popupCornerRadius + "px",
			'border-radius': wpac_options.popupCornerRadius + "px",
			opacity: wpac_options.popupOpacity/100, 
			color: textColor,
			textAlign: wpac_options.popupTextAlign,
			cursor: (type == "loading") ? 'wait' : 'default'
		},
		overlayCSS:  { 
			backgroundColor: '#000', 
			opacity: 0
		},
		baseZ: wpac_options.popupZindex
	}); 
	
}

var wpac_debug_errorShown = false;
function wpac_debug(level, message) {

	if (!wpac_options.debug) return;

	if (typeof window["console"] === "undefined" || typeof window["console"][level] === "undefined" || typeof window["console"][level].apply === "undefined") {
		if (!wpac_debug_errorShown) alert("console object is undefined or is not supported, debugging wp-ajaxify-comments is disabled! Please use Firebug or Google Chrome for debugging wp-ajaxify-comments.");
		wpac_debug_errorShown = true;
		return;
	}

	var args = jQuery.merge(["[WP-Ajaxify-Comments] " + message], jQuery.makeArray(arguments).slice(2));
	console[level].apply(console, args);
}

function wpac_debug_selector(elementType, selector) {

	if (!wpac_options.debug) return;

	var element = jQuery(selector);
	if (!element.length) {
		wpac_debug("error", "Search %s (selector '%s')... Not found", elementType, selector);
	} else {
		wpac_debug("info", "Search %s (selector '%s')... Found: %o", elementType, selector, element);
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
	wpac_debug("info", "Initializing (Version: %s)", wpac_options.version);

	// Skip initialization if comments are not enabled
	if (!wpac_options.commentsEnabled) {
		wpac_debug("info", "Abort initialization (comments are not enabled on current page)");
		return;
	}
	
	// Debug infos
	wpac_debug("info", "Search jQuery... Found: %s", jQuery.fn.jquery);
	wpac_debug_selector("comment form", wpac_options.selectorCommentForm);
	wpac_debug_selector("comments container", wpac_options.selectorCommentsContainer);
	wpac_debug_selector("respond container", wpac_options.selectorRespondContainer);
	wpac_debug("info", "Initialization complete");
	
	// Intercept comment form submit
	jQuery(wpac_options["selectorCommentForm"]).live("submit", function (event) {

		var form = jQuery(this);

		var submitUrl = form.attr('action');

		// Cancel AJAX request if cross-domain scripting is detected
		var domain = window.location.protocol + "//" + window.location.host;
		if (submitUrl.indexOf(domain) != 0) {
			wpac_debug("error", "Cross-domain scripting detected (domain: %s, submit url: %s), cancel AJAX request", domain, submitUrl);
			return;
		}
		
		// Stop default event handling
		event.preventDefault();
	
		// Show loading info
		wpac_showMessage(wpac_options["textLoading"], "loading");
	  
		var request = jQuery.ajax({
			url: submitUrl,
			type: "POST",
			data: form.serialize(),
			success: function (data) {

				wpac_debug("info", "Comment has been posted");

				var oldCommentsContainer = jQuery(wpac_options.selectorCommentsContainer);
				if (!oldCommentsContainer.length) {
					wpac_debug("info", "Comment container on current page not found (selector: '%s'), reloading page...", wpac_options.selectorCommentsContainer);
					return wpac_fallback(commentUrl);
				}
				
				var extractedBody = wpac_extractBody(data);
				var newCommentsContainer = extractedBody.find(wpac_options.selectorCommentsContainer);
				if (!newCommentsContainer.length) {
					wpac_debug("info", "Comment container on requested page not found (selector: '%s'), reloading page...", wpac_options.selectorCommentsContainer);
					return wpac_fallback(commentUrl);
				}

				var commentUrl = request.getResponseHeader('X-WPAC-URL');
				var unapproved = request.getResponseHeader('X-WPAC-UNAPPROVED');

				wpac_debug("info", "Found comment URL '%s' in X-WPAC-URL header.", commentUrl);
				wpac_debug("info", "Found unapproved state '%s' in X-WPAC-UNAPPROVED", unapproved);
				
				// Show success message
				wpac_showMessage(unapproved == '1' ? wpac_options["textPostedUnapproved"] : wpac_options["textPosted"], "success");
			
				// Update comments container
				oldCommentsContainer.replaceWith(newCommentsContainer);
				
				if (jQuery(wpac_options.selectorCommentForm).length) {

					// Replace comment form (for spam protection plugin compatibility) if comment form is not nested in comments container
					// If comment form is nested in comments container comment form is already replaced
					if (!newCommentsContainer.find(wpac_options.selectorCommentForm).length) {
						var newCommentForm = extractedBody.find(wpac_options.selectorCommentForm);
						if (newCommentForm.length == 0) return wpac_fallback(commentUrl);
						form.replaceWith(newCommentForm);
					}
					
				} else {

					// "Re-inject" comment form, if comment form was removed by updating the comments container; could happen 
					// if theme support threaded/nested comments and form tag is not nested in comments container
					// -> Replace Wordpress placeholder div (#wp-temp-form-div) with respond div
					var wpTempFormDiv = jQuery("#wp-temp-form-div");
					var newRespondContainer = extractedBody.find(wpac_options.selectorRespondContainer);
					if (!wpTempFormDiv.length || !newRespondContainer.length) return wpac_fallback(commentUrl);
					wpTempFormDiv.replaceWith(newRespondContainer);

				}

				// Smooth scroll to comment url and update browser url
				if (commentUrl) {
					var anchor = commentUrl.substr(commentUrl.indexOf("#"));
					if (anchor) {
						var anchorElement = jQuery(anchor)
						if (anchorElement.length) {
							jQuery('html,body').animate({scrollTop: anchorElement.offset().top}, {
								duration: wpac_options.scrollSpeed,
								complete: function() { window.location.hash = anchor; }
							});
						}
					}
				}
				
			},
			error: function (jqXhr, textStatus, errorThrown) {

				wpac_debug("info", "Comment has not been posted");
				wpac_debug("info", "Try to extract error message (selector: '%s')...", wpac_options.selectorErrorContainer);
			
				// Extract error message
				var extractedBody = wpac_extractBody(jqXhr.responseText);
				var errorMessage = extractedBody.find(wpac_options.selectorErrorContainer);
				if (errorMessage.length) {
					errorMessage = errorMessage.html();
					wpac_debug("info", "Error message '%s' successfully extracted", errorMessage);
				} else {
					wpac_debug("error", "Error message could not be extracted, use error message '%s'.", wpac_options.textUnknownError);
					errorMessage = wpac_options.textUnknownError;
				}
				
				wpac_showMessage(errorMessage, "error");
			}
  	    });
	  
	});

});