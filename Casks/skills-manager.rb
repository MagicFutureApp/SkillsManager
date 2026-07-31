cask "skills-manager" do
  version "0.2.0"
  sha256 "47f9f15d82b004545e93e1aaf17c2db71b0047385cac645cefd99cd096a5eb03"

  url "https://github.com/MagicFutureApp/SkillsManager/releases/download/v#{version}/skills-manager-#{version}-mac-arm64.dmg"
  name "Skills Manager"
  desc "Local-first desktop app for managing agent skills"
  homepage "https://github.com/MagicFutureApp/SkillsManager"

  depends_on macos: ">= :monterey"
  depends_on arch: :arm64

  app "Skills Manager.app"

  zap trash: [
    "~/Library/Application Support/skills-manager",
  ]
end
