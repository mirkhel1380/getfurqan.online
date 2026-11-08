# iOS 0.1.1 preparation

The native iPhone target is version 0.1.1/build 2, including the framed 604-page Quran reader and unchanged published source adapters. The minimum iOS version is 16.4, matching the existing Safari 16.4 compilation target. The earlier native setting of 15.0 claimed compatibility with runtimes lacking web features used by the reader. This corrects the declared requirement; it is not a claim that every supported device has been physically tested.

The build retries only Swift package resolution, which previously failed while downloading binary dependencies with HTTP 503. Each resolution attempt and actual compilation has a retained log. Compiler failures are not retried. Dependencies remain pinned; no checksum, TLS or signing verification is disabled to make a download succeed.

CI compiles a universal Simulator app (arm64 and x86_64) and an unsigned Release archive for physical iPhone arm64. Each is inspected for the actual bundle ID, version/build, minimum OS, architecture, local Capacitor configuration, compiled assets, exact source-manifest bytes and all thirteen preserved reading files. The packaged page index must contain all 604 pages and 6,236 verse references. Authentication pages and owner provisioning profiles must be absent. The machine-readable reports record exact source commit/run IDs and executable hashes.

The downloadable build package contains the two ZIPs, inspection reports, checksums and installation instructions. It is a developer handoff, not an installable IPA. The public iPhone QR continues to open the Safari web-app installation guide; it must not point ordinary visitors to an unsigned archive.

Apple signing requires the owner's real account and team in Xcode. No account, credentials, team IDs, provisioning profiles, certificate or App Store/TestFlight registration has been invented or created. A free Personal Team can be used for limited personal-device testing through Xcode, with provisioning limits; it is not general public distribution. Device installation, source-font appearance and audio behaviour on an actual iPhone remain pending until that owner step.

References checked 8 November 2026:

- https://developer.apple.com/help/account/basics/about-your-developer-account
- https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices
- https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/
