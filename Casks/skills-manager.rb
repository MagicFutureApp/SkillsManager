cask "skills-manager" do
  version "0.2.3"
  sha256 "5ddc3594a995d6854260649ff3fedffa97bfc8614de4b37ff23a02514974d091"

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
