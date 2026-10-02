import XCTest
@testable import WoolyWalking

final class HealthBridgeTests: XCTestCase {
    private func calendar(_ tz: String) -> Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: tz)!
        return c
    }

    func testWeekCoversWholeLocalDaysInclusive() throws {
        let cal = calendar("Australia/Brisbane")
        let i = try XCTUnwrap(HealthBridge.interval(start: "2026-10-15", end: "2026-10-21", calendar: cal))
        XCTAssertEqual(i.duration, 7 * 86_400)
        XCTAssertEqual(cal.dateComponents([.year, .month, .day, .hour], from: i.start),
                       DateComponents(year: 2026, month: 10, day: 15, hour: 0))
        XCTAssertEqual(cal.dateComponents([.month, .day, .hour], from: i.end),
                       DateComponents(month: 10, day: 22, hour: 0))
    }

    func testUsesThePhonesTimeZone() throws {
        let i = try XCTUnwrap(HealthBridge.interval(start: "2026-12-17", end: "2026-12-20", calendar: calendar("Europe/London")))
        XCTAssertEqual(i.duration, 4 * 86_400)
    }

    func testRejectsBadInput() {
        XCTAssertNil(HealthBridge.interval(start: "2026-10-21", end: "2026-10-15"))
        XCTAssertNil(HealthBridge.interval(start: "nope", end: "2026-10-15"))
    }
}
