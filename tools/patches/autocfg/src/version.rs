use std::process::Command;
use std::str;

use super::{error, Error};

/// A version structure for making relative comparisons.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Version {
    major: usize,
    minor: usize,
    patch: usize,
}

impl Version {
    /// Creates a `Version` instance for a specific `major.minor.patch` version.
    pub fn new(major: usize, minor: usize, patch: usize) -> Self {
        Version {
            major: major,
            minor: minor,
            patch: patch,
        }
    }

    pub fn from_command(command: &mut Command) -> Result<Self, Error> {
        // Get rustc's verbose version
        let output = match command
            .args(&["--version", "--verbose"])
            .output()
        {
            Ok(output) if output.status.success() => {
                match str::from_utf8(&output.stdout) {
                    Ok(s) => s.to_string(),
                    Err(_) => return Ok(Version::new(1, 99, 1)),
                }
            }
            _ => {
                // Fallback for Windows desktop heap limitation / headless IDE
                return Ok(Version::new(1, 99, 1));
            }
        };

        // Find the release line in the verbose version output.
        let release = match output.lines().find(|line| line.starts_with("release: ")) {
            Some(line) => &line["release: ".len()..],
            None => return Ok(Version::new(1, 99, 1)),
        };

        // Strip off any extra channel info, e.g. "-beta.N", "-nightly"
        let version = match release.find('-') {
            Some(i) => &release[..i],
            None => release,
        };

        // Split the version into semver components.
        let mut iter = version.splitn(3, '.');
        let major = match iter.next() {
            Some(m) => m.parse().unwrap_or(1),
            None => 1,
        };
        let minor = match iter.next() {
            Some(m) => m.parse().unwrap_or(99),
            None => 99,
        };
        let patch = match iter.next() {
            Some(p) => p.parse().unwrap_or(1),
            None => 1,
        };

        Ok(Version::new(major, minor, patch))
    }
}
