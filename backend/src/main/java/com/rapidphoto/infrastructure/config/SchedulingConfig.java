package com.rapidphoto.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables Spring's scheduling support for background maintenance jobs.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}

