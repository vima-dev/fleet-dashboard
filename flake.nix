{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
      ];
    in
    {
      packages = systems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "fleet-dashboard";
            version = "0.1.0";
            src = self;
            nativeBuildInputs = [
              pkgs.nodejs
              pkgs.pnpm
              pkgs.pnpmConfigHook
            ];
            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              fetcherVersion = 5;
              hash = "sha256-E7lVR2xqGRj30TQz+7yXH+njOjTrQbOkwBNhH8eb6Ko=";
            };
            buildPhase = "pnpm build";
            installPhase = "cp -r dist $out";
          });
        }
      );

      devShells = systems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs
              pkgs.pnpm
            ];
          };
        }
      );
    };
}
