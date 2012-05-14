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

function ac_resetForm(form) {
	jQuery(form).find('input:text, input:password, input:file, select, textarea').val('');
	jQuery(form).find('input:radio, input:checkbox').removeAttr('checked').removeAttr('selected');
}

var wpac_debug_errorShown = false;
function wpac_debug(level, message) {

	if (typeof window["console"] === 'undefined') {
		if (!wpac_debug_errorShown) alert("console object is undefined, debugging wp-ajaxify-comments is disabled!");
		wpac_debug_errorShown = true;
		return;
	}

	var args = jQuery.merge(["[WP-Ajaxify-Comments] " + message], jQuery.makeArray(arguments).slice(2));
	console[level].apply(console, args);
}

jQuery(document).ready(function() {

	var form = jQuery(jQuery(wpac_options.selectorCommentForm)[0]);
	var commentsContainer = jQuery(jQuery(wpac_options.selectorCommentsContainer)[0]);

	// Debug infos
	if (wpac_options.debug) {
		wpac_debug("info", "Enabled (Version: %s)", wpac_options.version);
		wpac_debug("info", "Search jQuery... Found: %s", jQuery.fn.jquery);
		if (form.length > 0) {
			wpac_debug("info", "Search comment form ('%s')... Found: %o", wpac_options.selectorCommentForm, form);
		} else {
			wpac_debug("error", "Search comment form ('%s')... Not found", wpac_options.selectorCommentForm);
		}
		if (commentsContainer.length > 0) {
			wpac_debug("info", "Search comments container ('%s')... Found: %o", wpac_options.selectorCommentsContainer, commentsContainer);
		} else {
			wpac_debug("error", "Search comment container ('%s')... Not found", wpac_options.selectorCommentsContainer);
		}
	}
	
	// Abort initialization
	if (form.length == 0 || commentsContainer.length == 0) return;
	
	// Intercept comment form submit
	jQuery(wpac_options["selectorCommentForm"]).live("submit", function (event) {
	
		var form = jQuery(this);
	
		event.preventDefault();
	  
		wpac_showMessage(wpac_options["textLoading"], "loading");
	  
		jQuery.ajax({
			url: form.attr('action'),
			type: "POST",
			data: form.serialize(),
			success: function (data) {

				var newComments = wpac_extractBody(data).find(wpac_options.selectorCommentsContainer);
				var oldComments = jQuery(wpac_options.selectorCommentsContainer);
				if (oldComments.length > 0 && newComments.length > 0) {
					// Update comments
					ac_resetForm(jQuery(form));
					wpac_showMessage(wpac_options["textPosted"], "success");
					oldComments.replaceWith(newComments);
				} else {
					// Fallback (page reload) if something went wrong
					location.reload(); 
				}
				
			},
			error: function (jqXhr, textStatus, errorThrown) {
				var error = wpac_extractBody(jqXhr.responseText).html();
				wpac_showMessage(error, "error");
			}
  	    });
	  
	});

});