// HTML elements
const input = document.getElementById('input-image');
const canvas = document.getElementById('preview-canvas');
const resizeBtn = document.getElementById('resize-btn');
const compressBtn = document.getElementById('compress-btn');
const editBtn = document.getElementById('edit-btn');

let originalImage = null;

// STEP 1: Handle file input and display on canvas
input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      originalImage = img;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// STEP 2: Compress image using Compressor.js
compressBtn.addEventListener('click', () => {
  if (!input.files[0]) return alert('Select an image first!');
  new Compressor(input.files[0], {
    quality: 0.7, // Adjust as needed (0.6~0.8 is usually good)
    success(result) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(result);
    }
  });
});

// STEP 3: Resize image using Pica
resizeBtn.addEventListener('click', async () => {
  if (!originalImage) return alert('Select an image first!');
  const tempCanvas = document.createElement('canvas');
  const targetWidth = 800; // Set to your desired width
  const targetHeight = Math.round(originalImage.height * (targetWidth / originalImage.width));
  tempCanvas.width = targetWidth;
  tempCanvas.height = targetHeight;
  await pica().resize(canvas, tempCanvas);
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.getContext('2d').drawImage(tempCanvas, 0, 0);
});

// STEP 4: Apply editing/sharpening using CamanJS
editBtn.addEventListener('click', () => {
  // Example: Apply sharpen filter
  Caman(canvas, function () {
    this.sharpen(20);
    this.render();
  });
});
