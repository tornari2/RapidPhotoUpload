package com.rapidphoto.features.get_photos.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for GetUserPhotosQuery with pagination
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GetUserPhotosResponse {
    
    private List<PhotoResponse> photos;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasNext;
    private boolean hasPrevious;
}

