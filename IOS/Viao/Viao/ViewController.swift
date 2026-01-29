//
//  ViewController.swift
//  Viao
//
//  Created by Sufyan Akhtar on 28/05/2025.
//

import UIKit
import WebKit
import AVFoundation
import Photos
import CoreLocation

class ViewController: UIViewController, WKNavigationDelegate,WKUIDelegate {
    
    @IBOutlet var webView: WKWebView!
    
    private let startUrl = "https://www.viao.ch/"
    private var progressView: UIProgressView!
    private var didShowPhotoAlert = false
    private let locationManager = CLLocationManager()
    private var didShowLocationAlert = false
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupWebView()
        setupProgressView()
        
        // Load initial URL
        if let url = URL(string: startUrl) {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        didShowPhotoAlert = false
        didShowLocationAlert = false
    }

    
    
    private func setupWebView() {
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.uiDelegate = self
        locationManager.delegate = self
        // Observe loading progress
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
    }
    
    private func setupProgressView() {
        progressView = UIProgressView(progressViewStyle: .default)
        progressView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(progressView)
        
        NSLayoutConstraint.activate([
            progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 2)
        ])
        
        progressView.isHidden = true
    }
    
    // MARK: - WKNavigationDelegate
    
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        progressView.isHidden = false
        progressView.setProgress(0.1, animated: true)
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        progressView.setProgress(1.0, animated: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.progressView.isHidden = true
            self.progressView.setProgress(0, animated: false)
        }
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showErrorPage(error: error)
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showErrorPage(error: error)
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        let scheme = url.scheme?.lowercased()
        if scheme != nil && scheme != "http" && scheme != "https" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }
    
    // MARK: - Error Handling
    
    private func showErrorPage(error: Error) {
        progressView.isHidden = true

        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return
        }
        if nsError.domain == "WebKitErrorDomain" && nsError.code == 102 {
            return
        }

        let errorHTML = """
        <html><body style="text-align:center;padding:24px;">
        <h2>Couldn't load the page</h2>
        <p>\(error.localizedDescription)</p>
        </body></html>
        """
        webView.loadHTMLString(errorHTML, baseURL: nil)
    }
    
    // MARK: - Progress Observation
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "estimatedProgress" {
            let progress = Float(webView.estimatedProgress)
            progressView.setProgress(progress, animated: true)
        }
    }
    
    // MARK: - Navigation
    
    override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        if presses.first?.type == .menu { // Back button equivalent
            if webView.canGoBack {
                webView.goBack()
            } else {
                super.pressesEnded(presses, with: event)
            }
        } else {
            super.pressesEnded(presses, with: event)
        }
    }
    
    // For devices with home button (alternative back navigation)
    override func willMove(toParent parent: UIViewController?) {
        if parent == nil && webView.canGoBack {
            webView.goBack()
        }
    }
    
    // MARK: - Cleanup
    
    deinit {
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        webView.stopLoading()
        webView.navigationDelegate = nil
    }
    
    func checkCameraPermission() {
        let status = AVCaptureDevice.authorizationStatus(for: .video)

        switch status {
        case .authorized:
            // Camera already allowed
           // openCamera()
            print("Camera already allowed")

        case .notDetermined:
            // Ask permission
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    if granted {
                      //  self.openCamera()
                    } else {
                        self.showCameraSettingsAlert()
                    }
                }
            }

        case .denied, .restricted:
            // User previously denied
            showCameraSettingsAlert()

        @unknown default:
            showCameraSettingsAlert()
        }
    }
    
    func showCameraSettingsAlert() {
        let alert = UIAlertController(
            title: "Camera Access Needed",
            message: "Please allow camera access in Settings to take a photo and update your profile.",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
            }
        })

        present(alert, animated: true)
    }

    func showMicrophoneSettingsAlert() {
        let alert = UIAlertController(
            title: "Microphone Access Needed",
            message: "Please allow microphone access in Settings to use this feature.",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
            }
        })

        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        switch type {
        case .camera:
            let status = AVCaptureDevice.authorizationStatus(for: .video)
            switch status {
            case .authorized:
                decisionHandler(.grant)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        decisionHandler(granted ? .grant : .deny)
                        if !granted { self.showCameraSettingsAlert() }
                    }
                }
            case .denied, .restricted:
                decisionHandler(.deny)
                showCameraSettingsAlert()
            @unknown default:
                decisionHandler(.deny)
            }

        case .microphone:
            let status = AVCaptureDevice.authorizationStatus(for: .audio)
            switch status {
            case .authorized:
                decisionHandler(.grant)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .audio) { granted in
                    DispatchQueue.main.async {
                        decisionHandler(granted ? .grant : .deny)
                        if !granted { self.showMicrophoneSettingsAlert() }
                    }
                }
            case .denied, .restricted:
                decisionHandler(.deny)
                showMicrophoneSettingsAlert()
            @unknown default:
                decisionHandler(.deny)
            }

        case .cameraAndMicrophone:
            let cam = AVCaptureDevice.authorizationStatus(for: .video)
            let mic = AVCaptureDevice.authorizationStatus(for: .audio)

            if cam == .authorized && mic == .authorized {
                decisionHandler(.grant)
                return
            }

            let requestCam: (@escaping (Bool) -> Void) -> Void = { cb in
                if cam == .notDetermined {
                    AVCaptureDevice.requestAccess(for: .video) { granted in cb(granted) }
                } else {
                    cb(cam == .authorized)
                }
            }

            let requestMic: (@escaping (Bool) -> Void) -> Void = { cb in
                if mic == .notDetermined {
                    AVCaptureDevice.requestAccess(for: .audio) { granted in cb(granted) }
                } else {
                    cb(mic == .authorized)
                }
            }

            requestCam { camGranted in
                requestMic { micGranted in
                    DispatchQueue.main.async {
                        let granted = camGranted && micGranted
                        decisionHandler(granted ? .grant : .deny)
                        if !camGranted { self.showCameraSettingsAlert() }
                        if !micGranted { self.showMicrophoneSettingsAlert() }
                    }
                }
            }

        @unknown default:
            decisionHandler(.deny)
        }
    }
    


    func handlePhotoPermission() {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)

        switch status {
        case .authorized, .limited:
            // Allowed
            break

        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { newStatus in
                DispatchQueue.main.async {
                    if newStatus == .denied {
                        self.showPhotoPermissionAlert()
                    }
                }
            }

        case .denied, .restricted:
            showPhotoPermissionAlert()

        @unknown default:
            showPhotoPermissionAlert()
        }
    }
    

    func showPhotoPermissionAlert() {
        guard !didShowPhotoAlert else { return }
        didShowPhotoAlert = true

        let alert = UIAlertController(
            title: "Photo Access Needed",
            message: "Please allow photo access in Settings to upload images.",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
            UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)
        })

        present(alert, animated: true)
    }



}

extension ViewController : CLLocationManagerDelegate{
    func requestLocationPermission() {
        let status = locationManager.authorizationStatus

        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            break

        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()

        case .denied, .restricted:
            showLocationPermissionAlert()

        @unknown default:
            showLocationPermissionAlert()
        }
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus

        if status == .denied || status == .restricted {
            showLocationPermissionAlert()
        }
    }
    
    func showLocationPermissionAlert() {
        guard !didShowLocationAlert else { return }
        didShowLocationAlert = true

        let alert = UIAlertController(
            title: "Location Access Needed",
            message: "Please enable location access in Settings to use this feature.",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
            UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)
        })

        present(alert, animated: true)
    }

}

