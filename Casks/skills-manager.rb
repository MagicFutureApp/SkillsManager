cask "skills-manager" do
  version "0.2.5"
  sha256 "51b49d9b81dfbd3d0db72931ad4ffd7d0c6f2540dd1be0ebfe67c5c791144b41"

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
