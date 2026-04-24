// Get DOM elements
const file1 = document.getElementById("file1");
const file2 = document.getElementById("file2");
const preview1 = document.getElementById("preview1");
const preview2 = document.getElementById("preview2");
const fileName1 = document.getElementById("fileName1");
const fileName2 = document.getElementById("fileName2");
const placeholder1 = document.getElementById("placeholder1");
const placeholder2 = document.getElementById("placeholder2");
const form = document.getElementById("uploadForm");
const resultBox = document.getElementById("resultBox");
const resultText = document.getElementById("resultText");
const compareBtn = document.getElementById("compareBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const similarityContainer = document.getElementById("similarityContainer");
const similarityFill = document.getElementById("similarityFill");
const similarityPercent = document.getElementById("similarityPercent");
const distanceInfo = document.getElementById("distanceInfo");
const resultIcon = document.getElementById("resultIcon");

// Preview function with enhanced features
function setupPreview(input, preview, fileNameSpan, placeholder) {
    input.addEventListener("change", function() {
        const file = this.files[0];
        
        if (file) {
            // Update file name
            fileNameSpan.textContent = file.name;

            if (!isValidImage(file)) {
                showToast("Invalid file! Use JPG, PNG, or GIF ❌");

                input.value = '';
                fileNameSpan.textContent = 'No file chosen';
                preview.style.display = 'none';
                placeholder.style.display = 'flex';
    
                return; // 🚨 VERY IMPORTANT
            }
            
            // Validate file size (max 5MB)
            /* if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                this.value = '';
                fileNameSpan.textContent = 'No file chosen';
                preview.style.display = 'none';
                placeholder.style.display = 'flex';
                return;
            } */
            
            // Preview image
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = "block";
                placeholder.style.display = "none";
            };
            reader.readAsDataURL(file);
            
            // Hide result when new image is selected
            resultBox.style.display = "none";
            similarityContainer.style.display = "none";
        } else {
            fileNameSpan.textContent = 'No file chosen';
            preview.style.display = "none";
            placeholder.style.display = "flex";
            preview.src = "";
        }
    });
}

// Apply preview setup
setupPreview(file1, preview1, fileName1, placeholder1);
setupPreview(file2, preview2, fileName2, placeholder2);

// Function to update result display with enhanced UI
function updateResultDisplay(data) {
    // Show result box
    resultBox.style.display = "block";
    
    // Set result text and icon based on match
    if (data.result.includes("✅")) {
        resultText.innerHTML = data.result;
        resultIcon.innerHTML = '<i class="fas fa-check-circle" style="color: #48bb78;"></i>';
        resultText.style.color = "#38a169";
    } else if (data.result.includes("❌")) {
        resultText.innerHTML = data.result;
        resultIcon.innerHTML = '<i class="fas fa-times-circle" style="color: #e53e3e;"></i>';
        resultText.style.color = "#e53e3e";
    } else {
        resultText.innerHTML = data.result;
        resultIcon.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ed8936;"></i>';
        resultText.style.color = "#ed8936";
    }
    
    // Show similarity score if available
    if (data.similarity !== undefined && data.distance !== undefined) {
        similarityContainer.style.display = "block";
        
        // Animate similarity bar
        setTimeout(() => {
            similarityFill.style.width = data.similarity + "%";
            similarityFill.textContent = data.similarity >= 30 ? Math.round(data.similarity) + "%" : "";
        }, 100);
        
        similarityPercent.textContent = Math.round(data.similarity) + "%";
        
        // Set color based on similarity score
        if (data.similarity >= 70) {
            similarityFill.style.background = "linear-gradient(90deg, #48bb78, #38a169)";
        } else if (data.similarity >= 40) {
            similarityFill.style.background = "linear-gradient(90deg, #ed8936, #dd6b20)";
        } else {
            similarityFill.style.background = "linear-gradient(90deg, #e53e3e, #c53030)";
        }
        
        distanceInfo.textContent = `Feature Distance: ${data.distance.toFixed(2)} (Lower is better)`;
    } else {
        similarityContainer.style.display = "none";
    }
}

// Handle form submission with enhanced error handling
form.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // Check if both files are selected
    if (!file1.files[0] || !file2.files[0]) {
        resultBox.style.display = "block";
        resultText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Please select both signature images!';
        resultText.style.color = "#ed8936";
        resultIcon.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ed8936;"></i>';
        similarityContainer.style.display = "none";
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (resultText.innerHTML.includes("Please select")) {
                resultBox.style.display = "none";
            }
        }, 3000);
        return;
    }
    
    // Show loading overlay
    loadingOverlay.style.display = "flex";
    compareBtn.disabled = true;
    
    // Prepare form data
    const formData = new FormData();
    formData.append("original_image", file1.files[0]);
    formData.append("test_image", file2.files[0]);
    
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        // Send request to Flask backend
        const response = await fetch("/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is ok
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.result || `Server error: ${response.status}`);
        }
        
        // Parse response
        const data = await response.json();
        
        // Update UI with result
        updateResultDisplay(data);
        
    } catch (error) {
        console.error("Error:", error);
        
        // Handle different error types
        let errorMessage = "";
        if (error.name === "AbortError") {
            errorMessage = "Request timeout. Server took too long to respond.";
        } else if (error.message.includes("Failed to fetch")) {
            errorMessage = "Cannot connect to server. Make sure Flask is running (python app.py)";
        } else {
            errorMessage = error.message || "An unexpected error occurred.";
        }
        
        // Display error in result box
        resultBox.style.display = "block";
        resultText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${errorMessage}`;
        resultText.style.color = "#e53e3e";
        resultIcon.innerHTML = '<i class="fas fa-times-circle" style="color: #e53e3e;"></i>';
        similarityContainer.style.display = "none";
        
    } finally {
        // Hide loading overlay
        loadingOverlay.style.display = "none";
        compareBtn.disabled = false;
    }
});

// Clear result when new images are selected
function clearResultOnNewImage() {
    resultBox.style.display = "none";
    similarityContainer.style.display = "none";
    resultText.innerHTML = "";
}

file1.addEventListener("change", clearResultOnNewImage);
file2.addEventListener("change", clearResultOnNewImage);

// Add drag and drop functionality
function setupDragAndDrop(previewContainer, input, preview, fileNameSpan, placeholder) {
    const container = previewContainer.parentElement;
    
    container.addEventListener("dragover", (e) => {
        e.preventDefault();
        container.style.borderColor = "#667eea";
        container.style.backgroundColor = "#f0f4ff";
    });
    
    container.addEventListener("dragleave", (e) => {
        e.preventDefault();
        container.style.borderColor = "#cbd5e0";
        container.style.backgroundColor = "white";
    });
    
    container.addEventListener("drop", (e) => {
        e.preventDefault();
        container.style.borderColor = "#cbd5e0";
        container.style.backgroundColor = "white";
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            input.files = e.dataTransfer.files;
            const changeEvent = new Event("change");
            input.dispatchEvent(changeEvent);
        } else {
            alert("Please drop an image file");
        }
    });
}

// Extension Info Message
function isValidImage(file) {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    return allowedTypes.includes(file.type);
}

// When selecting first file
file1.addEventListener("change", function () {
    const file = this.files[0];

    if (file && !isValidImage(file)) {
        showToast("Invalid file! Use JPG, PNG, or GIF ❌");
        file1.value = ""; // reset input
        preview1.style.display = "none";
    }
});

// When selecting second file
file2.addEventListener("change", function () {
    const file = this.files[0];

    if (file && !isValidImage(file)) {
        showToast("Invalid file! Use JPG, PNG, or GIF ❌");
        file2.value = "";
        preview2.style.display = "none";
    }
});

// Toast message function
function showToast(message, type="error") {
    const toast = document.getElementById("toast");

    toast.innerText = message;
    toast.style.background = type === "error" ? "#e53e3e" : "#38a169";
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Apply drag and drop to preview containers
setupDragAndDrop(preview1, file1, preview1, fileName1, placeholder1);
setupDragAndDrop(preview2, file2, preview2, fileName2, placeholder2);

// Keyboard shortcut: Enter to submit
document.addEventListener("keypress", function(e) {
    if (e.key === "Enter" && document.activeElement !== compareBtn) {
        if (file1.files[0] && file2.files[0]) {
            compareBtn.click();
        }
    }
});

// Console log for debugging
console.log("Signature Verification System Loaded Successfully!");
console.log("Make sure Flask server is running on http://127.0.0.1:5000/upload");