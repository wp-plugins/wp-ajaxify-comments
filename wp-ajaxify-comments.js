if (!window["WPAC"]) var WPAC = {};

WPAC._Regex = new RegExp("<body[^>]*>((.|\n|\r)*)</body>", "i");

WPAC._ExtractBody = function(html) {
	try {
		return jQuery("<div>"+WPAC._Regex.exec(html)[1]+"</div>");
	} catch (e) {
		return false;
	}
}

WPAC._ShowMessage = function (message, type) {

	var top = WPAC._Options.popupMarginTop + jQuery("#wpadminbar").outerHeight();

	var backgroundColor = WPAC._Options.popupBackgroundColorLoading;
	var textColor = WPAC._Options.popupTextColorLoading;
	if (type == "error") {
		backgroundColor = WPAC._Options.popupBackgroundColorError;
		textColor = WPAC._Options.popupTextColorError;
	} else if (type == "success") {
		backgroundColor = WPAC._Options.popupBackgroundColorSuccess;
		textColor = WPAC._Options.popupTextColorSuccess;
	}
	
	jQuery.blockUI({ 
		message: message, 
		fadeIn: WPAC._Options.popupFadeIn, 
		fadeOut: WPAC._Options.popupFadeOut, 
		timeout:(type == "loading") ? 0 : WPAC._Options.popupTimeout,
		centerY: false,
		centerX: true,
		showOverlay: (type == "loading"),
		css: { 
			width: WPAC._Options.popupWidth + "%",
			left: ((100-WPAC._Options.popupWidth)/2) + "%",
			top: top + "px",
			border: "none", 
			padding: WPAC._Options.popupPadding + "px", 
			backgroundColor: backgroundColor, 
			"-webkit-border-radius": WPAC._Options.popupCornerRadius + "px",
			"-moz-border-radius": WPAC._Options.popupCornerRadius + "px",
			"border-radius": WPAC._Options.popupCornerRadius + "px",
			opacity: WPAC._Options.popupOpacity/100, 
			color: textColor,
			textAlign: WPAC._Options.popupTextAlign,
			cursor: (type == "loading") ? "wait" : "default",
			"font-size": WPAC._Options.popupTextFontSize
		},
		overlayCSS:  { 
			backgroundColor: "#000", 
			opacity: 0
		},
		baseZ: WPAC._Options.popupZindex
	}); 
	
}

WPAC._DebugErrorShown = false;
WPAC._Debug = function(level, message) {

	if (!WPAC._Options.debug) return;

	// Fix console.log.apply for IE9
	// see http://stackoverflow.com/a/5539378/516472
	if (Function.prototype.call && Function.prototype.call.bind && typeof window["console"] != "undefined" && console && typeof console.log == "object" && typeof window["console"][level].apply === "undefined") {
		console[level] = Function.prototype.call.bind(console[level], console);
	}

	if (typeof window["console"] === "undefined" || typeof window["console"][level] === "undefined" || typeof window["console"][level].apply === "undefined") {
		if (!WPAC._DebugErrorShown) alert("Unfortunately the console object is undefined or is not supported in your browser, debugging wp-ajaxify-comments is disabled! Please use Firebug, Google Chrome or Internet Explorer 9 or above with enabled Developer Tools (F12) for debugging wp-ajaxify-comments.");
		WPAC._DebugErrorShown = true;
		return;
	}

	var args = jQuery.merge(["[WP-Ajaxify-Comments] " + message], jQuery.makeArray(arguments).slice(2));
	console[level].apply(console, args);
}

WPAC._DebugSelector = function(elementType, selector) {
	if (!WPAC._Options.debug) return;

	var element = jQuery(selector);
	if (!element.length) {
		WPAC._Debug("error", "Search %s (selector: '%s')... Not found", elementType, selector);
	} else {
		WPAC._Debug("info", "Search %s (selector: '%s')... Found: %o", elementType, selector, element);
	}
}

WPAC._AddQueryParamStringToUrl = function(url, param, value) {
	
	var query = param + "=" + value; 
	if (url.indexOf("?") >= 0) {
		return url.replace("?", "?" + query + "&");
	}
	if (url.indexOf("#") >= 0) {
		return url.replace("#", "?" + query + "#");
	}
	return url += "?" + query;
}

WPAC._LoadFallbackUrl = function(fallbackUrl) {

	WPAC._ShowMessage(WPAC._Options["textReloadPage"], "loading");
	
	var url = WPAC._AddQueryParamStringToUrl(fallbackUrl, "WPACRandom", (new Date()).getTime());
	WPAC._Debug("info", "Something went wrong. Reloading page (URL: '%s')...", url);
	
	var reload = function() { location.href = url; };
	if (!WPAC._Options.debug) {
		reload();
	} else {
		WPAC._Debug("info", "Sleep for 5s to enable analyzing debug messages...");
		window.setTimeout(reload, 5000);
	}
}

WPAC._ScrollToAnchor = function(anchor) {
	var anchorElement = jQuery(anchor)
	if (anchorElement.length) {
		WPAC._Debug("info", "Scroll to anchor element %o (scroll sped: %s ms)...", anchorElement, WPAC._Options.scrollSpeed);
		jQuery("html,body").animate({scrollTop: anchorElement.offset().top}, {
			duration: WPAC._Options.scrollSpeed,
			complete: function() { window.location.hash = anchor; }
		});
		return true;
	} else {
		WPAC._Debug("error", "Anchor element not found (selector: '%s')", anchor);
		return false;
	}
}

WPAC._ReplaceComments = function(data, fallbackUrl) {
	
	var oldCommentsContainer = jQuery(WPAC._Options.selectorCommentsContainer);
	if (!oldCommentsContainer.length) {
		WPAC._Debug("error", "Comment container on current page not found (selector: '%s')", WPAC._Options.selectorCommentsContainer);
		return WPAC._LoadFallbackUrl(fallbackUrl);
	}
	
	var extractedBody = WPAC._ExtractBody(data);
	if (extractedBody === false) {
		WPAC._Debug("error", "Unsupported server response, unable to extract body (data: '%s')", data);
		return WPAC._LoadFallbackUrl(fallbackUrl);
	}
	
	WPAC._Callbacks["onBeforeSelectElements"](extractedBody);
	
	var newCommentsContainer = extractedBody.find(WPAC._Options.selectorCommentsContainer);
	if (!newCommentsContainer.length) {
		WPAC._Debug("error", "Comment container on requested page not found (selector: '%s')", WPAC._Options.selectorCommentsContainer);
		return WPAC._LoadFallbackUrl(fallbackUrl);
	}

	WPAC._Callbacks["onBeforeUpdateComments"]();

	// Update comments container
	oldCommentsContainer.replaceWith(newCommentsContainer);
	
	if (jQuery(WPAC._Options.selectorCommentForm).length) {

		// Replace comment form (for spam protection plugin compatibility) if comment form is not nested in comments container
		// If comment form is nested in comments container comment form has already been replaced
		if (!newCommentsContainer.find(WPAC._Options.selectorCommentForm).length) {

			WPAC._Debug("info", "Replace comment form...");
			var newCommentForm = extractedBody.find(WPAC._Options.selectorCommentForm);
			if (newCommentForm.length == 0) {
				WPAC._Debug("error", "Comment form on requested page not found (selector: '%s')", WPAC._Options.selectorCommentForm);
				return WPAC._LoadFallbackUrl(fallbackUrl);
			}
			form.replaceWith(newCommentForm);
		}
		
	} else {

		WPAC._Debug("info", "Try to re-inject comment form...");
	
		// "Re-inject" comment form, if comment form was removed by updating the comments container; could happen 
		// if theme support threaded/nested comments and form tag is not nested in comments container
		// -> Replace WordPress placeholder <div> (#wp-temp-form-div) with respond <div>
		var wpTempFormDiv = jQuery("#wp-temp-form-div");
		if (!wpTempFormDiv.length) {
			WPAC._Debug("error", "WordPress' #wp-temp-form-div container not found", WPAC._Options.selectorRespondContainer);
			return WPAC._LoadFallbackUrl(fallbackUrl);
		}
		var newRespondContainer = extractedBody.find(WPAC._Options.selectorRespondContainer);
		if (!newRespondContainer.length) {
			WPAC._Debug("error", "Respond container on requested page not found (selector: '%s')", WPAC._Options.selectorRespondContainer);
			return WPAC._LoadFallbackUrl(fallbackUrl);
		}
		wpTempFormDiv.replaceWith(newRespondContainer);

	}

	WPAC._Callbacks["onAfterUpdateComments"]();		
}

WPAC._Initialized = false;
WPAC.Init = function() {

	// Test if plugin already has been initialized
	if (WPAC._Initialized) {
		WPAC._Debug("info", "Abort initialization (plugin already initialized)");
		return false;
	}
	WPAC._Initialized = true;
	
	// Assert that environment is set up correctly
	if (!WPAC._Options || !WPAC._Callbacks) {
		WPAC._Debug("error", "Something unexpected happened, initialization failed. Please try to reinstall the plugin.");
		return false;
	}

	// Debug infos
	WPAC._Debug("info", "Initializing version %s", WPAC._Options.version);

	WPAC._Callbacks["onBeforeSelectElements"](jQuery(document));
	
	// Skip initialization if comments are not enabled
	if (!WPAC._Options.commentsEnabled) {
		WPAC._Debug("info", "Abort initialization (comments are not enabled on current page)");
		return false;
	}
	
	// Debug infos
	if (WPAC._Options.debug) {
		if (!jQuery || !jQuery.fn || !jQuery.fn.jquery) {
			WPAC._Debug("error", "jQuery not found, abort initialization. Please try to reinstall the plugin.");
			return false;
		}
		WPAC._Debug("info", "Found jQuery %s", jQuery.fn.jquery);
		if (!jQuery || !jQuery.blockUI || !jQuery.blockUI.version) {
			WPAC._Debug("error", "jQuery blockUI not found, abort initialization. Please try to reinstall the plugin.");
			return false;
		}
		WPAC._Debug("info", "Found jQuery blockUI %s", jQuery.blockUI.version);
		WPAC._DebugSelector("comment form", WPAC._Options.selectorCommentForm);
		WPAC._DebugSelector("comments container", WPAC._Options.selectorCommentsContainer);
		WPAC._DebugSelector("respond container", WPAC._Options.selectorRespondContainer);
		WPAC._Debug("info", "Initialization completed");
	}
	
	// Intercept comment form submit
	var submitHandler = function (event) {

		var form = jQuery(this);

		var submitUrl = form.attr("action");

		// Cancel AJAX request if cross-domain scripting is detected
		var domain = window.location.protocol + "//" + window.location.host;
		if (submitUrl.indexOf(domain) != 0) {
			WPAC._Debug("error", "Cross-domain scripting detected (domain: '%s', submit url: '%s'), cancel AJAX request", domain, submitUrl);
			return;
		}
		
		// Stop default event handling
		event.preventDefault();
	
		// Show loading info
		WPAC._ShowMessage(WPAC._Options["textPostComment"], "loading");

		WPAC._Callbacks["onBeforeSubmitComment"]();
		
		var request = jQuery.ajax({
			url: submitUrl,
			type: "POST",
			data: form.serialize(),
			beforeSend: function(xhr){ xhr.setRequestHeader('X-WPAC-REQUEST', '1'); },
			success: function (data) {
 
				WPAC._Debug("info", "Comment has been posted");

				// Get info from response header
				var commentUrl = request.getResponseHeader("X-WPAC-URL");
				WPAC._Debug("info", "Found comment URL '%s' in X-WPAC-URL header.", commentUrl);
				var unapproved = request.getResponseHeader("X-WPAC-UNAPPROVED");
				WPAC._Debug("info", "Found unapproved state '%s' in X-WPAC-UNAPPROVED", unapproved);
				
				// Show success message
				WPAC._ShowMessage(unapproved == '1' ? WPAC._Options["textPostedUnapproved"] : WPAC._Options["textPosted"], "success");

				// Replace comments
				WPAC._ReplaceComments(data, commentUrl);
				
				// Smooth scroll to comment url and update browser url
				if (commentUrl) {
					var anchor = commentUrl.substr(commentUrl.indexOf("#"));
					if (anchor) {
						WPAC._Debug("info", "Anchor '%s' extracted from comment URL '%s'", anchor, commentUrl);
						WPAC._ScrollToAnchor(anchor);
					}
				}
				
			},
			error: function (jqXhr, textStatus, errorThrown) {

				WPAC._Debug("info", "Comment has not been posted");
				WPAC._Debug("info", "Try to extract error message (selector: '%s')...", WPAC._Options.selectorErrorContainer);
			
				// Extract error message
				var extractedBody = WPAC._ExtractBody(jqXhr.responseText);
				if (extractedBody !== false) {
					var errorMessage = extractedBody.find(WPAC._Options.selectorErrorContainer);
					if (errorMessage.length) {
						errorMessage = errorMessage.html();
						WPAC._Debug("info", "Error message '%s' successfully extracted", errorMessage);
						WPAC._ShowMessage(errorMessage, "error");
						return;
					}
				}

				WPAC._Debug("error", "Error message could not be extracted, use error message '%s'.", WPAC._Options.textUnknownError);
				WPAC._ShowMessage(WPAC._Options.textUnknownError, "error");
			}
  	    });
	  
	};

	// Add submit handler
	if (jQuery(document).on) {
		// jQuery 1.7+
		jQuery(document).on("submit", WPAC._Options["selectorCommentForm"], submitHandler);
	} else if (jQuery(document).delegate) {
		// jQuery 1.4.3+
		jQuery(document).delegate(WPAC._Options["selectorCommentForm"], "submit", submitHandler);
	} else {
		// jQuery 1.3+
		jQuery(WPAC._Options["selectorCommentForm"]).live("submit", submitHandler);
	}
	
	return true;
}

WPAC.RefreshComments = function(scrollToAnchor) {
	
	// Save form data
	var formData = jQuery(WPAC._Options["selectorCommentForm"]).serializeArray();
	
	// Show loading info
	WPAC._ShowMessage(WPAC._Options["textRefreshComments"], "loading");
	
	var url = location.href;
	
	var request = jQuery.ajax({
		url: url,
		type: "POST",
		beforeSend: function(xhr){ xhr.setRequestHeader('X-WPAC-REQUEST', '1'); },
		success: function (data) {

			// Replace comments
			WPAC._ReplaceComments(data, WPAC._AddQueryParamStringToUrl(window.location.href, "WPACFallback", 1));
			
			// Re-inject saved form data
			jQuery.each(formData, function(key, value) {
				var formElement = jQuery("[name='"+value.name+"']", WPAC._Options["selectorCommentForm"]);
				if (formElement.length != 1 || formElement.val()) return;
				formElement.val(value.value);
			})

			// Scroll to anchor
			if (scrollToAnchor !== false) {
				var anchor = window.location.hash;
				if (anchor) {
					WPAC._Debug("info", "Anchor '%s' extracted from current URL", anchor);
					WPAC._ScrollToAnchor(anchor);
				}
			}
			
			// Unblock UI
			jQuery.unblockUI();			
		},
		error: function() {
			WPAC._LoadFallbackUrl(WPAC._AddQueryParamStringToUrl(window.location.href, "WPACFallback", "1"))
		} 
		
	});
	
	return true;
}

jQuery(function() {
	var initSuccesful = WPAC.Init();
	if (WPAC._Options['loadCommentsAsync']) {
		if (!initSuccesful) {
			WPAC._LoadFallbackUrl(WPAC._AddQueryParamStringToUrl(window.location.href, "WPACFallback", "1"))
			return;
		} 
		WPAC._Debug("info", "Loading comments asynchronously with secondary AJAX request");
		WPAC.RefreshComments();
	} 
});

function wpac_init() {
	WPAC._Debug("info", "wpac_init() is deprecated, please use WPAC.Init()");
	WPAC.Init();
}