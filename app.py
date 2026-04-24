from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
import numpy as np
import cv2
import webbrowser
from threading import Timer

# Initialize Flask app
app = Flask(__name__)

# Allowed file extensions for upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# =========================
# Utility Functions
# =========================
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def grayscale(img):
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def binarization(gray_img):
    binary = cv2.adaptiveThreshold(
        gray_img, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15, 2
    )
    return binary


def preprocess(binary_img, kernel_size=(3,3)):
    kernel = np.ones(kernel_size, np.uint8)
    clean = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, kernel)
    return clean


def resize_to(img, target_shape):
    h, w = target_shape
    return cv2.resize(img, (w, h))


def extract_features(clean_img):
    contours, _ = cv2.findContours(clean_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None

    cnt = max(contours, key=cv2.contourArea)

    area = cv2.contourArea(cnt)
    perimeter = cv2.arcLength(cnt, True)

    moments = cv2.moments(clean_img)
    hu = cv2.HuMoments(moments).flatten()

    return np.concatenate(([area, perimeter], hu))


# =========================
# Routes
# =========================
@app.route('/Homepage')
def home():
    return render_template('Homepage.html')


@app.route('/upload', methods=['POST'])
def upload():
    try:
        # =========================
        # Get files
        # =========================
        original_file = request.files.get('original_image')
        test_file = request.files.get('test_image')

        if not original_file or not test_file:
            return jsonify({"result": "Files not received ❌"}), 400

        if original_file.filename == '' or test_file.filename == '':
            return jsonify({"result": "Please select both images ❌"}), 400

        if not allowed_file(original_file.filename) or not allowed_file(test_file.filename):
            return jsonify({"result": "Invalid file type ❌"}), 400

        # =========================
        # Save files
        # =========================
        UPLOAD_FOLDER = os.path.join(app.root_path, 'uploads')
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        original_path = os.path.join(UPLOAD_FOLDER, secure_filename(original_file.filename))
        test_path = os.path.join(UPLOAD_FOLDER, secure_filename(test_file.filename))

        original_file.save(original_path)
        test_file.save(test_path)

        # =========================
        # Read images
        # =========================
        original_img = cv2.imread(original_path)
        test_img = cv2.imread(test_path)

        if original_img is None or test_img is None:
            return jsonify({"result": "Image reading failed ❌"}), 400

        # =========================
        # Processing
        # =========================
        original_gray = grayscale(original_img)
        test_gray = grayscale(test_img)

        original_bin = binarization(original_gray)
        test_bin = binarization(test_gray)

        original_clean = preprocess(original_bin)
        test_clean = preprocess(test_bin)

        # IMPORTANT: Resize BEFORE features
        test_clean = resize_to(test_clean, original_clean.shape)

        # =========================
        # Feature extraction
        # =========================
        feat1 = extract_features(original_clean)
        feat2 = extract_features(test_clean)

        if feat1 is None or feat2 is None:
            return jsonify({"result": "No signature detected ❌"})

        # =========================
        # Comparison
        # =========================
        distance = np.linalg.norm(feat1 - feat2)
        similarity = max(0, 100 - distance) 

        print("Distance:", distance)  # DEBUG
        print("Similarity:", similarity)  # DEBUG

        if distance < 500:
            result = "Match ✅"
        else:
            result = "Not Match ❌"

        return jsonify({
            "result": result
        })

    except Exception as e:
        print("ERROR:", str(e))  # VERY IMPORTANT DEBUG
        return jsonify({"result": "Internal Server Error ❌"}), 500


# =========================
# Run
# =========================
if __name__ == '__main__':
    print("==============================")
    print("Starting Flask application...")
    print("==============================")

    url = "http://127.0.0.1:5000/Homepage"
    Timer(1, lambda: webbrowser.open(url)).start()

    app.run(debug=True)