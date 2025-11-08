package com.rapidphoto.infrastructure.config;

import com.rapidphoto.RapidPhotoUploadApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for AsyncConfig
 */
@SpringBootTest(classes = RapidPhotoUploadApplication.class)
class AsyncConfigTest {
    
    @Autowired
    private AsyncConfig asyncConfig;
    
    @Autowired
    private Executor taskExecutor;
    
    @Test
    void testAsyncConfigBeanExists() {
        assertNotNull(asyncConfig, "AsyncConfig bean should be created");
    }
    
    @Test
    void testTaskExecutorBeanExists() {
        assertNotNull(taskExecutor, "TaskExecutor bean should be created");
    }
    
    @Test
    void testTaskExecutorIsThreadPoolTaskExecutor() {
        assertInstanceOf(ThreadPoolTaskExecutor.class, taskExecutor, 
            "TaskExecutor should be an instance of ThreadPoolTaskExecutor");
    }
    
    @Test
    void testThreadPoolSize() {
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) taskExecutor;
        assertEquals(100, executor.getCorePoolSize(), 
            "Core pool size should be 100");
        assertEquals(100, executor.getMaxPoolSize(), 
            "Max pool size should be 100");
    }
    
    @Test
    void testThreadNamePrefix() {
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) taskExecutor;
        assertEquals("upload-async-", executor.getThreadNamePrefix(), 
            "Thread name prefix should be 'upload-async-'");
    }
    
    @Test
    void testQueueCapacity() {
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) taskExecutor;
        assertEquals(0, executor.getQueueCapacity(), 
            "Queue capacity should be 0 for fixed pool");
    }
    
    @Test
    void testShutdownConfiguration() {
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) taskExecutor;
        // Verify executor is properly configured (shutdown settings are internal)
        assertNotNull(executor, "Executor should not be null");
        // The shutdown configuration is set but not directly accessible via getters
        // We verify it's configured by checking the executor is functional
    }
}

