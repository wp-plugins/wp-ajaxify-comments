<?php
/*
Plugin Name: WP-Ajaxify-Comments
Plugin URI: http://wordpress.org/extend/plugins/wp-ajaxify-comments/
Description: WP-Ajaxify-Comments hooks into your current theme and adds AJAX functionality to the comment form.
Author: Jan Jonas
Author URI: http://janjonas.net
Version: 0.0.1
License: GPLv2
Text Domain: 
*/ 

/*  Copyright 2012, Jan Jonas, (email : mail@janjonas.net)

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License, version 2, as 
    published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

define('WPAC_PLUGIN_NAME', 'WP-Ajaxify-Comments');
define('WPAC_SETTINGS_URL', 'admin.php?page='.WPAC_PLUGIN_NAME);

// Option names
define('WPAC_OPTION_NAME_DEBUG', 'wpac_debug');
define('WPAC_OPTION_NAME_ENABLE', 'wpac_enable');
define('WPAC_OPTION_NAME_SELECTOR_COMMENT_FORM', 'wpac_selectorCommentForm');
define('WPAC_OPTION_NAME_SELECTOR_COMMENTS_CONTAINER', 'wpac_selectorCommentsContainer');

// Option defaults
define('WPAC_OPTION_DEFAULTS_SELECTOR_COMMENT_FORM', '#commentform');
define('WPAC_OPTION_DEFAULTS_SELECTOR_COMMENTS_CONTAINER', '#comments');


function wpac_enqueue_scripts() {
	$version = wpac_get_version();
	wp_enqueue_script('jQueryBlockUi', WP_PLUGIN_URL.'/wp-ajaxify-comments/jquery.blockUI.js', array('jquery'), $version);
	wp_enqueue_script('ajaxifyComments', WP_PLUGIN_URL.'/wp-ajaxify-comments/wp-ajaxify-comments.js', array('jquery', 'jQueryBlockUi'), $version);
}

function wpac_get_version() {
	if (!function_exists('get_plugins')) require_once(ABSPATH .'wp-admin/includes/plugin.php');
	$data = get_plugin_data(__FILE__);
    return $data['Version'];
}

function wpac_initialize() {
	if (get_option(WPAC_OPTION_NAME_ENABLE)) {
		$version = wpac_get_version();
		echo '<script type="text/javascript">
		var wpac_options = {
			debug: '.(get_option('wpac_debug') ? 'true' : 'false').',
			version: "'.wpac_get_version().'",
			selectorCommentForm: "'.(get_option(WPAC_OPTION_NAME_SELECTOR_COMMENT_FORM) ? get_option(WPAC_OPTION_NAME_SELECTOR_COMMENT_FORM) : WPAC_OPTION_DEFAULTS_SELECTOR_COMMENT_FORM).'",
			selectorCommentsContainer: "'.(get_option(WPAC_OPTION_NAME_SELECTOR_COMMENTS_CONTAINER) ? get_option(WPAC_OPTION_NAME_SELECTOR_COMMENTS_CONTAINER) : WPAC_OPTION_DEFAULTS_SELECTOR_COMMENTS_CONTAINER).'",
			textLoading: "Posting your comment. Please wait&hellip;",
			textPosted: "Your comment was posted. Thank you!",
			popupCornerRadius: 5
		};
	   </script>';
	}
}

function wpac_is_login_page() {
    return in_array($GLOBALS['pagenow'], array('wp-login.php', 'wp-register.php'));
}

function wpac_add_settings_link($links, $file) {
	static $this_plugin;
	if (!$this_plugin) $this_plugin = plugin_basename(__FILE__);
	if ($file == $this_plugin){
		$settings_link = '<a href="'.WPAC_SETTINGS_URL.'">Settings</a>';
		array_unshift($links, $settings_link);
	}
	return $links;
}
add_filter('plugin_action_links', 'wpac_add_settings_link', 10, 2 );

function wpac_admin_notice() {
	if (basename($_SERVER['PHP_SELF']) == 'plugins.php') {
		if (!get_option(WPAC_OPTION_NAME_ENABLE)) {
			// Show error if plugin is not enabled
			echo '<div class="error"><p><strong>'.WPAC_PLUGIN_NAME.' is not enabled!</strong> Click <a href="'.WPAC_SETTINGS_URL.'">here</a> to configure the plugin.</p></div>';
		} else if (get_option(WPAC_OPTION_NAME_DEBUG)) {
			// Show info if plugin is running in debug mode
			echo '<div class="updated"><p><strong>'.WPAC_PLUGIN_NAME.' is running in debug mode!</strong> Click <a href="'.WPAC_SETTINGS_URL.'">here</a> to configure the plugin.</p></div>';
		}
	}
}
add_action('admin_notices', 'wpac_admin_notice');

function wpac_option_page() {

	if (!current_user_can('manage_options'))  {
		wp_die( __('You do not have sufficient permissions to access this page.') );
	} 
  
	if (!empty($_POST) && check_admin_referer('wpac_update_settings','wpac_nonce_field'))
	{
		foreach($_POST['wpac'] as $key => $value) {
			update_option($key, stripslashes($value));
		}
		echo '<div class="updated"><p><strong>Settings saved successfully.</strong></p></div>';
	}
  
  ?>
	<div class="wrap">
	<h2>Plugin Settings: <?php echo WPAC_PLUGIN_NAME.' '.wpac_get_version(); ?></h2>

	<div class="postbox-container" style="width: 100%;" >

		<form name="wp-ajaxify-comments-settings-update" method="post" action="">
			<?php if (function_exists('wp_nonce_field') === true) wp_nonce_field('wpac_update_settings','wpac_nonce_field'); ?>	 

			<div id="poststuff">
				<div class="postbox">
					<h3 id="plugin-settings">Plugin Settings</h3>
					<div class="inside">
				
						<table class="form-table">
							<tr>
								<th scope="row">
									<label for="<?php echo WPAC_OPTION_NAME_ENABLE; ?>">Enabled plugin:</label>
								</th>
								<td>
									<input type="hidden" name="wpac[<?php echo WPAC_OPTION_NAME_ENABLE; ?>]" value="0">
									<input type="checkbox" name="wpac[<?php echo WPAC_OPTION_NAME_ENABLE; ?>]" id="<?php echo WPAC_OPTION_NAME_ENABLE; ?>" <?php if (get_option(WPAC_OPTION_NAME_ENABLE)) echo 'checked="checked"'; ?>/>
								</td>
							</tr>						
							<tr>
								<th scope="row">
									<label for="<?php echo WPAC_OPTION_NAME_DEBUG; ?>">Debug mode:</label>
								</th>
								<td>
									<input type="hidden" name="wpac[<?php echo WPAC_OPTION_NAME_DEBUG; ?>]" value="0">
									<input type="checkbox" name="wpac[<?php echo WPAC_OPTION_NAME_DEBUG; ?>]" id="<?php echo WPAC_OPTION_NAME_DEBUG; ?>" <?php if (get_option(WPAC_OPTION_NAME_DEBUG)) echo 'checked="checked"'; ?>/>
								</td>
							</tr>							
							<tr>
								<th scope="row">
									<label for="<?php echo WPAC_OPTION_NAME_SELECTOR_COMMENT_FORM; ?>">Comment Form Selector:</label>
								</th>
								<td>
									<input type="input" name="wpac[<?php echo WPAC_OPTION_NAME_SELECTOR_COMMENT_FORM; ?>]" id="<?php echo WPAC_OPTION_NAME_SELECTOR_COMMENT_FORM; ?>" value="<?php echo get_option(WPAC_OPTION_NAME_SELECTOR_COMMENT_FORM); ?>" style="width: 300px"/>
									<br/>Leave empty for default value <em><?php echo WPAC_OPTION_DEFAULTS_SELECTOR_COMMENT_FORM; ?></em>
								</td>
							</tr>
							<tr>
								<th scope="row">
									<label for="<?php echo WPAC_OPTION_NAME_SELECTOR_COMMENTS_CONTAINER; ?>">Comments Container Selector:</label>
								</th>
								<td>
									<input type="input" name="wpac[<?php echo WPAC_OPTION_NAME_SELECTOR_COMMENTS_CONTAINER; ?>]" id="<?php echo WPAC_OPTION_NAME_SELECTOR_COMMENTS_CONTAINER; ?>" value="<?php echo get_option(WPAC_OPTION_NAME_SELECTOR_COMMENTS_CONTAINER); ?>" style="width: 300px"/>
									<br/>Leave empty for default value <em><?php echo WPAC_OPTION_DEFAULTS_SELECTOR_COMMENTS_CONTAINER; ?></em>
								</td>
							</tr>
						</table>
						<p class="submit">
						  <input type="hidden" name="action" value="wpac_update_settings"/>
						  <input type="submit" name="wpac_update_settings" class="button-primary" value="<?php _e('Save Changes') ?>"/>
						</p>
					</div>
				</div>
			</div>

		</form>	
	
	</div>

	<div class="postbox-container" style="width: 100%;" >

		<form action="https://www.paypal.com/cgi-bin/webscr" method="post">
			
			<input type="hidden" name="cmd" value="_s-xclick">
			<input type="hidden" name="hosted_button_id" value="MLKQ3VNZUBEQQ">
			<img alt="" border="0" src="https://www.paypalobjects.com/de_DE/i/scr/pixel.gif" width="1" height="1">

			<div id="poststuff">
				<div class="postbox">
					<h3 id="plugin-settings">Contact & Donation</h3>
					<div class="inside">	
						<p>If you have trouble using the plugin or you miss a feature please do not hesitate to contact me (mail@janjonas.net).
						</p>
						<p>
							If you would like to support future development, please consider making a small donation. Thank you!
							<br/>
							<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">
						</p>
					</div>
				</div>
			</div>
		</form>		
	</div>
		
<?php }

if (!is_admin() && !wpac_is_login_page()) {
	if (get_option(WPAC_OPTION_NAME_ENABLE)) {
		add_action('wp_head', 'wpac_initialize');
		add_action('init', 'wpac_enqueue_scripts');
	}
} else {

	require_once(ABSPATH.'/wp-admin/includes/plugin.php');
	require_once(ABSPATH.'/wp-admin/includes/template.php');
	require_once(ABSPATH.WPINC.'/pluggable.php');
	add_options_page(WPAC_PLUGIN_NAME, WPAC_PLUGIN_NAME, 'manage_options', WPAC_PLUGIN_NAME, 'wpac_option_page');
}

?>