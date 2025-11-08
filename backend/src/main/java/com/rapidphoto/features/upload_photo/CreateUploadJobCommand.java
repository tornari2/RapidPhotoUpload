package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.User;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobRequest;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Command for creating an upload job
 * Encapsulates the data needed to create an upload job and generate presigned URLs
 */
@Data
@Builder
public class CreateUploadJobCommand {
    
    private User user;
    private List<PhotoInfo> photos;
    
    /**
     * Photo information for upload job creation
     */
    @Data
    @Builder
    public static class PhotoInfo {
        private String filename;
        private Long fileSize;
        private String contentType;
    }
    
    /**
     * Factory method to create command from request DTO
     */
    public static CreateUploadJobCommand fromRequest(User user, CreateUploadJobRequest request) {
        List<PhotoInfo> photoInfos = request.getPhotos().stream()
                .map(photo -> PhotoInfo.builder()
                        .filename(photo.getFilename())
                        .fileSize(photo.getFileSize())
                        .contentType(photo.getContentType())
                        .build())
                .collect(Collectors.toList());
        
        return CreateUploadJobCommand.builder()
                .user(user)
                .photos(photoInfos)
                .build();
    }
}

