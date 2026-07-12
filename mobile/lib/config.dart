/// Backend configuration.
///
/// The mobile app talks to the SAME Node/Express backend and SQLite database
/// that powers the web control panel. Point [apiBase] at your running server.
///
/// Defaults for local development:
///  - Android emulator  -> http://10.0.2.2:4000 (10.0.2.2 = host machine)
///  - iOS simulator     -> http://localhost:4000
///  - Real device       -> http://<YOUR_COMPUTER_LAN_IP>:4000
///  - Production         -> https://api.yourdomain.com
///
/// Override at build/run time without editing code:
///   flutter run --dart-define=API_BASE=https://api.yourdomain.com
class Config {
  static const String apiBase = String.fromEnvironment(
    'API_BASE',
defaultValue: 'https://alert-benevolence-production-b766.up.railway.app',
  );
}
