package com.rapidphoto.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configuration for asynchronous method execution
 * Provides a fixed thread pool of 100 threads for concurrent upload handling
 */
@Configuration
@EnableAsync
public class AsyncConfig {
    
    private static final int THREAD_POOL_SIZE = 100;
    private static final String THREAD_NAME_PREFIX = "upload-async-";
    
    /**
     * Configures a fixed thread pool executor for async operations
     * 
     * @return ThreadPoolTaskExecutor with 100 threads
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(THREAD_POOL_SIZE);
        executor.setMaxPoolSize(THREAD_POOL_SIZE);
        executor.setQueueCapacity(0); // No queue for fixed pool
        executor.setThreadNamePrefix(THREAD_NAME_PREFIX);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}

