<?php
/**
 * Plugin Name: Flooring Calculator
 * Description: Adds a flooring layout calculator with printable cut lists via the [flooring_calculator] shortcode.
 * Version: 1.0.0
 * Author: Flooring Calculator Plugin
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

const FLOORING_CALCULATOR_PLUGIN_VERSION = '1.0.0';

/**
 * Register the shortcode output container.
 */
function flooring_calculator_render_shortcode(): string {
    // This ID must match what your Vite entry (main.jsx) looks for.
    return '<div id="flooring-calculator-root"></div>';
}
add_shortcode('flooring_calculator', 'flooring_calculator_render_shortcode');

/**
 * Enqueue assets when the shortcode is present on the page.
 */
function flooring_calculator_enqueue_assets(): void {
    if (!is_singular()) {
        return;
    }

    global $post;
    if (!$post instanceof WP_Post || !has_shortcode($post->post_content, 'flooring_calculator')) {
        return;
    }

    // Built asset relative paths
    $css_rel = 'assets/flooring-calculator.css';
    $js_rel  = 'assets/flooring-calculator.js';

    $css_path = plugin_dir_path(__FILE__) . $css_rel;
    $js_path  = plugin_dir_path(__FILE__) . $js_rel;

    // Enqueue compiled CSS (Tailwind output)
    if (file_exists($css_path)) {
        wp_enqueue_style(
            'flooring-calculator',
            plugin_dir_url(__FILE__) . $css_rel,
            [],
            filemtime($css_path)
        );
    }

    // Enqueue bundled JS (Vite output). No React/Babel CDNs needed.
    if (file_exists($js_path)) {
        wp_enqueue_script(
            'flooring-calculator',
            plugin_dir_url(__FILE__) . $js_rel,
            [],
            filemtime($js_path),
            true
        );
    } else {
        // Optional: helpful console warning if build output is missing
        // (won't break the page)
        $msg = 'Flooring Calculator: missing built asset ' . $js_rel . '. Run `npm run build` and ensure the assets/ folder is included in the plugin zip.';
        wp_register_script('flooring-calculator-missing', '', [], FLOORING_CALCULATOR_PLUGIN_VERSION, true);
        wp_enqueue_script('flooring-calculator-missing');
        wp_add_inline_script('flooring-calculator-missing', 'console.warn(' . wp_json_encode($msg) . ');');
    }
}
add_action('wp_enqueue_scripts', 'flooring_calculator_enqueue_assets');
