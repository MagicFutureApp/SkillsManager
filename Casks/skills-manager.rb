cask "skills-manager" do
  version "0.3.0"
  sha256 "eb5dc105edf4a6a802658192ff20cf121a4dee6f07884258dd9185991fcc7557"

  url "https://github.com/MagicFutureApp/SkillsManager/releases/download/v#{version}/skills-manager-#{version}-mac-arm64.dmg"
  name "Skills Manager"
  desc "Local-first desktop app for managing agent skills"
  homepage "https://github.com/MagicFutureApp/SkillsManager"

  livecheck do
    url :stable
    regex(/^v?(\d+(?:\.\d+)+)$/i)
    strategy :github_releases
  end

  depends_on macos: :monterey
  depends_on arch: :arm64

  app "Skills Manager.app"

  zap trash: [
    "~/Library/Application Support/skills-manager",
  ]
end
