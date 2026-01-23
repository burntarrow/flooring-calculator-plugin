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

    wp_enqueue_script(
        'flooring-calculator-tailwind',
        'https://cdn.tailwindcss.com',
        [],
        FLOORING_CALCULATOR_PLUGIN_VERSION,
        true
    );

    wp_enqueue_script(
        'flooring-calculator-react',
        'https://unpkg.com/react@18/umd/react.production.min.js',
        [],
        '18.2.0',
        true
    );

    wp_enqueue_script(
        'flooring-calculator-react-dom',
        'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
        ['flooring-calculator-react'],
        '18.2.0',
        true
    );

    wp_enqueue_script(
        'flooring-calculator-babel',
        'https://unpkg.com/@babel/standalone/babel.min.js',
        [],
        '7.24.0',
        true
    );

    wp_enqueue_script(
        'flooring-calculator-app',
        plugins_url('assets/flooring-calculator.js', __FILE__),
        ['flooring-calculator-react', 'flooring-calculator-react-dom', 'flooring-calculator-babel'],
        FLOORING_CALCULATOR_PLUGIN_VERSION,
        true
    );
    wp_script_add_data('flooring-calculator-app', 'type', 'text/babel');
    wp_script_add_data('flooring-calculator-app', 'data-presets', 'react');
}
add_action('wp_enqueue_scripts', 'flooring_calculator_enqueue_assets');
