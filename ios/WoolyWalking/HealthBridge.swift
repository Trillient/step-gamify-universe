import Foundation
import HealthKit
import WebKit

/// Lets the site ask for the user's step total for a challenge week.
/// JS: `await window.webkit.messageHandlers.health.postMessage({ start: "2026-10-15", end: "2026-10-21" })`
/// resolves to a whole number of steps. Read-only; only answers the site's own main frame.
final class HealthBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let name = "health"
    private let store = HKHealthStore()

    @MainActor
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) async -> (Any?, String?) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.host.lowercased() == NavigationPolicy.siteHost else {
            return (nil, "not-allowed")
        }
        guard HKHealthStore.isHealthDataAvailable() else { return (nil, "unavailable") }
        guard let body = message.body as? [String: Any],
              let start = body["start"] as? String, let end = body["end"] as? String,
              let interval = HealthBridge.interval(start: start, end: end) else {
            return (nil, "bad-request")
        }

        let steps = HKQuantityType(.stepCount)
        do {
            try await store.requestAuthorization(toShare: [], read: [steps])
            let predicate = HKSamplePredicate.quantitySample(
                type: steps,
                predicate: HKQuery.predicateForSamples(withStart: interval.start, end: interval.end))
            let query = HKStatisticsQueryDescriptor(predicate: predicate, options: .cumulativeSum)
            let total = try await query.result(for: store)?.sumQuantity()?.doubleValue(for: .count()) ?? 0
            return (Int(total.rounded()), nil)
        } catch {
            return (nil, "failed")
        }
    }

    /// Whole local days from `start` to `end` inclusive ("yyyy-MM-dd"), so a week's steps match the phone's own day boundaries.
    static func interval(start: String, end: String, calendar: Calendar = .current) -> DateInterval? {
        let f = DateFormatter()
        f.calendar = calendar
        f.timeZone = calendar.timeZone
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        guard let s = f.date(from: start), let e = f.date(from: end), s <= e,
              let endExclusive = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: e)) else { return nil }
        return DateInterval(start: calendar.startOfDay(for: s), end: endExclusive)
    }
}
