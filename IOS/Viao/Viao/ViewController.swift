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
import EventKit

class ViewController: UIViewController, WKNavigationDelegate,WKUIDelegate {
    
    @IBOutlet var webView: WKWebView!
    
    private let startUrl = "https://viao.ch/"
    private var progressView: UIProgressView!
    private var didShowPhotoAlert = false
    private let locationManager = CLLocationManager()
    private var didShowLocationAlert = false
    private let eventStore = EKEventStore()
    private var isAddingCalendarEvent = false
    
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
        webView.configuration.applicationNameForUserAgent = "ViaoIOSApp"
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

    private func isCalendarRoute(_ url: URL) -> Bool {
        if url.pathExtension.lowercased() == "ics" {
            return true
        }

        let path = url.path.lowercased()
        let isEventCalendarPath = path.contains("/api/events/") && (path.hasSuffix("/calendar") || path.hasSuffix("/calendar/"))
        return isEventCalendarPath
    }

    private struct ParsedCalendarEvent {
        let title: String
        let notes: String?
        let location: String?
        let startDate: Date
        let endDate: Date
    }

    private func decodeIcsText(_ value: String) -> String {
        return value
            .replacingOccurrences(of: "\\\\", with: "\\")
            .replacingOccurrences(of: "\\n", with: "\n")
            .replacingOccurrences(of: "\\,", with: ",")
            .replacingOccurrences(of: "\\;", with: ";")
    }

    private func parseIcsDate(_ value: String) -> Date? {
        let utcFormatter = DateFormatter()
        utcFormatter.locale = Locale(identifier: "en_US_POSIX")
        utcFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        utcFormatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"

        if let d = utcFormatter.date(from: value) {
            return d
        }

        let localFormatter = DateFormatter()
        localFormatter.locale = Locale(identifier: "en_US_POSIX")
        localFormatter.timeZone = TimeZone.current
        localFormatter.dateFormat = "yyyyMMdd'T'HHmmss"

        if let d = localFormatter.date(from: value) {
            return d
        }

        let dayFormatter = DateFormatter()
        dayFormatter.locale = Locale(identifier: "en_US_POSIX")
        dayFormatter.timeZone = TimeZone.current
        dayFormatter.dateFormat = "yyyyMMdd"

        if let d = dayFormatter.date(from: value) {
            return d
        }

        return nil
    }

    private func parseCalendarEvent(from text: String) -> ParsedCalendarEvent? {
        let rawLines = text.components(separatedBy: CharacterSet.newlines)
        var unfoldedLines: [String] = []

        for raw in rawLines {
            let line = raw.trimmingCharacters(in: .newlines)
            if line.hasPrefix(" ") || line.hasPrefix("\t") {
                if let last = unfoldedLines.indices.last {
                    unfoldedLines[last] += String(line.dropFirst())
                }
            } else if !line.isEmpty {
                unfoldedLines.append(line)
            }
        }

        var title: String?
        var notes: String?
        var location: String?
        var startDate: Date?
        var endDate: Date?

        for line in unfoldedLines {
            if line.hasPrefix("SUMMARY:") {
                title = decodeIcsText(String(line.dropFirst("SUMMARY:".count)))
                continue
            }
            if line.hasPrefix("DESCRIPTION:") {
                notes = decodeIcsText(String(line.dropFirst("DESCRIPTION:".count)))
                continue
            }
            if line.hasPrefix("LOCATION:") {
                location = decodeIcsText(String(line.dropFirst("LOCATION:".count)))
                continue
            }
            if line.hasPrefix("DTSTART"), let value = line.split(separator: ":", maxSplits: 1).last {
                startDate = parseIcsDate(String(value))
                continue
            }
            if line.hasPrefix("DTEND"), let value = line.split(separator: ":", maxSplits: 1).last {
                endDate = parseIcsDate(String(value))
                continue
            }
        }

        guard let start = startDate else { return nil }
        let end = (endDate != nil && endDate! > start) ? endDate! : start.addingTimeInterval(2 * 60 * 60)

        return ParsedCalendarEvent(
            title: title?.isEmpty == false ? title! : "Event",
            notes: notes,
            location: location,
            startDate: start,
            endDate: end
        )
    }

    private func requestCalendarAccess(completion: @escaping (Bool) -> Void) {
        let status = EKEventStore.authorizationStatus(for: .event)

        if #available(iOS 17.0, *) {
            switch status {
            case .fullAccess, .writeOnly, .authorized:
                completion(true)
            case .notDetermined:
                eventStore.requestFullAccessToEvents { granted, _ in
                    completion(granted)
                }
            case .denied, .restricted:
                completion(false)
            @unknown default:
                completion(false)
            }
        } else {
            switch status {
            case .authorized:
                completion(true)
            case .notDetermined:
                eventStore.requestAccess(to: .event) { granted, _ in
                    completion(granted)
                }
            case .denied, .restricted:
                completion(false)
            @unknown default:
                completion(false)
            }
        }
    }

    private func showCalendarAlert(title: String, message: String) {
        DispatchQueue.main.async {
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self.present(alert, animated: true)
        }
    }

    private func fetchCalendarFile(from url: URL, completion: @escaping (String?) -> Void) {
        webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("text/calendar,text/plain,*/*", forHTTPHeaderField: "Accept")

            if let host = url.host?.lowercased() {
                let matchingCookies = cookies.filter { cookie in
                    let domain = cookie.domain.lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "."))
                    return host == domain || host.hasSuffix("." + domain)
                }
                let headers = HTTPCookie.requestHeaderFields(with: matchingCookies)
                for (key, value) in headers {
                    request.setValue(value, forHTTPHeaderField: key)
                }
            }

            let task = URLSession.shared.dataTask(with: request) { data, response, error in
                if error != nil {
                    completion(nil)
                    return
                }

                guard
                    let httpResponse = response as? HTTPURLResponse,
                    (200..<300).contains(httpResponse.statusCode),
                    let data,
                    let icsText = String(data: data, encoding: .utf8)
                else {
                    completion(nil)
                    return
                }

                completion(icsText)
            }

            task.resume()
        }
    }

    private func saveCalendarEvent(_ parsed: ParsedCalendarEvent) throws -> Bool {
        let calendar = eventStore.defaultCalendarForNewEvents
        let searchStart = parsed.startDate.addingTimeInterval(-60)
        let searchEnd = parsed.endDate.addingTimeInterval(60)
        let calendars = calendar != nil ? [calendar!] : nil

        let predicate = eventStore.predicateForEvents(withStart: searchStart, end: searchEnd, calendars: calendars)
        let existing = eventStore.events(matching: predicate).contains { event in
            let sameTitle = event.title == parsed.title
            let startDelta = abs(event.startDate.timeIntervalSince(parsed.startDate))
            return sameTitle && startDelta < 60
        }

        if existing {
            return false
        }

        let event = EKEvent(eventStore: eventStore)
        event.calendar = calendar
        event.title = parsed.title
        event.startDate = parsed.startDate
        event.endDate = parsed.endDate
        event.notes = parsed.notes
        event.location = parsed.location

        try eventStore.save(event, span: .thisEvent, commit: true)
        return true
    }

    private func addCalendarEventFromUrl(_ url: URL) {
        if isAddingCalendarEvent { return }
        isAddingCalendarEvent = true

        fetchCalendarFile(from: url) { icsText in
            guard let icsText, let parsed = self.parseCalendarEvent(from: icsText) else {
                DispatchQueue.main.async {
                    self.isAddingCalendarEvent = false
                    UIApplication.shared.open(url)
                }
                return
            }

            self.requestCalendarAccess { granted in
                if !granted {
                    self.isAddingCalendarEvent = false
                    self.showCalendarAlert(
                        title: "Calendar Access Needed",
                        message: "Please allow calendar access in Settings to add events automatically."
                    )
                    return
                }

                do {
                    let created = try self.saveCalendarEvent(parsed)
                    self.isAddingCalendarEvent = false
                    self.showCalendarAlert(
                        title: created ? "Added to Calendar" : "Already in Calendar",
                        message: created ? "The event was added to your calendar." : "This event is already in your calendar."
                    )
                } catch {
                    self.isAddingCalendarEvent = false
                    self.showCalendarAlert(
                        title: "Could not Add Event",
                        message: "Please try again."
                    )
                }
            }
        }
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

        if isCalendarRoute(url) {
            addCalendarEventFromUrl(url)
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

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let mimeType = navigationResponse.response.mimeType?.lowercased() ?? ""
        if mimeType.contains("text/calendar"), let url = navigationResponse.response.url {
            addCalendarEventFromUrl(url)
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

