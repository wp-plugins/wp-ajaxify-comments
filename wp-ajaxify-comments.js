function wpac_extractBody(html) {
	var regex = new RegExp('<body[^>]*>((.|\n|\r)*)</body>', 'i');
	return jQuery(regex.exec(html)[1]);
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
		timeout: 3000,
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

function wpac_resetForm(form) {
	jQuery(form).find('input:text, input:password, input:file, select, textarea').val('');
	jQuery(form).find('input:radio, input:checkbox').removeAttr('checked').removeAttr('selected');
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

jQuery(document).ready(function() {

	// Debug infos
	if (wpac_options.debug) {
		wpac_debug("info", "Initializing (Version: %s)", wpac_options.version);
	}

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
	
		event.preventDefault();
	  
		wpac_showMessage(wpac_options["textLoading"], "loading");
	  
		var request = jQuery.ajax({
			url: form.attr('action'),
			type: "POST",
			data: form.serialize(),
			success: function (data) {

				var extractedBody = wpac_extractBody(data);
				var newComments = extractedBody.find(wpac_options.selectorCommentsContainer);
				var oldComments = jQuery(wpac_options.selectorCommentsContainer);
				var needFallback = true;
				
				if (oldComments.length > 0 && newComments.length > 0) {

					wpac_showMessage(wpac_options["textPosted"], "success");
				
					// Update comment list
					oldComments.replaceWith(newComments);
					
					// "Re-inject" comment form, if comment form was removed by updating the comment list; could happen 
					// if theme support threaded/nested comments and form tag is not nested in comment container
					// -> Replace Wordpress placeholder div (#wp-temp-form-div) with respond div
					if (jQuery(wpac_options.selectorCommentForm).length == 0) {

						var wpTempFormDiv = jQuery("#wp-temp-form-div");
						var newCommentForm = extractedBody.find(wpac_options.selectorRespondContainer);		
					
						if (wpTempFormDiv.length > 0 && newCommentForm.length > 0) {
							wpTempFormDiv.replaceWith(newCommentForm);
							needFallback = false;
						}
						
					} else {
						needFallback = false;
					}

					// Reset comment form
					wpac_resetForm(form);

					// Smooth scroll to comment url and update browser url
					var commentUrl = request.getResponseHeader('X-WPAC-URL');
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
					
				} 
				
				if (!needFallback) return;
				
				// Fallback (page reload) if something went wrong
				wpac_showMessage(wpac_options["textReloadPage"], "loading");
				location.reload(); 
				
			},
			error: function (jqXhr, textStatus, errorThrown) {
				var error = wpac_extractBody(jqXhr.responseText).html();
				wpac_showMessage(error, "error");
			}
  	    });
	  
	});

});