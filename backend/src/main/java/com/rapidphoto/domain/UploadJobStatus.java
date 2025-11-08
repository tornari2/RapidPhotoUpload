package com.rapidphoto.domain;

/**
 * Status of an upload job (batch of photos)
 */
public enum UploadJobStatus {
    IN_PROGRESS,
    COMPLETED,
    PARTIAL_SUCCESS,
    FAILED
}

