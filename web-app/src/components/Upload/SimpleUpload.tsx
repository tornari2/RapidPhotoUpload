export function SimpleUpload() {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('Files selected:', files.length);
      const event = new CustomEvent('uploadFiles', {
        detail: { files: Array.from(files) },
      });
      window.dispatchEvent(event);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      {/* File Upload - Visible styled input */}
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#ffffff',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      />

      {/* Folder Upload - Visible styled input */}
      <input
        type="file"
        multiple
        accept="image/*"
        /* @ts-ignore */
        webkitdirectory=""
        directory=""
        onChange={handleFileChange}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#ffffff',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      />
    </div>
  );
}
