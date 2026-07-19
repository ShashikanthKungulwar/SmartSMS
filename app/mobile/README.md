# SmartSMS Mobile

React Native app (`app/mobile`) that reads incoming SMS on-device, classifies them via the bundled
TFLite model, and syncs rules/feedback with the backend.

## Known production gaps

### Certificate pinning (deferred)

The Axios client in `src/api/client.ts` talks to the backend over plain HTTP in development
(`http://10.0.2.2:3000`, the Android emulator's host-loopback address) and would move to HTTPS in
production. Certificate pinning is normally added via OkHttp's `CertificatePinner` in native code,
but since networking currently goes through Axios/JS rather than a custom OkHttp client, wiring up
pinning properly means touching the native networking layer — not something to bolt on partially.

This is a known gap for production hardening, tracked as a TODO in `src/api/client.ts`. Before a
production release, add certificate pinning (e.g. via `react-native-ssl-pinning`, or a custom
OkHttp client with `CertificatePinner`) so the app rejects MITM'd TLS certs even if the device's
trust store is compromised.
