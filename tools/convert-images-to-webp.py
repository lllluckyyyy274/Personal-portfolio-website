from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"


def webp_path_for(source: Path) -> Path:
    return source.with_suffix(".webp")


def convert_png(source: Path) -> tuple[bool, int, int]:
    target = webp_path_for(source)
    source_size = source.stat().st_size

    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return False, source_size, target.stat().st_size

    with Image.open(source) as image:
        image = image.convert("RGBA") if image.mode in ("P", "LA") else image
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, "WEBP", quality=82, method=6)

    return True, source_size, target.stat().st_size


def main() -> None:
    converted = 0
    png_total = 0
    webp_total = 0

    for source in ASSETS.rglob("*.png"):
        did_convert, source_size, target_size = convert_png(source)
        converted += int(did_convert)
        png_total += source_size
        webp_total += target_size

    saved = png_total - webp_total
    print(f"PNG files scanned: {len(list(ASSETS.rglob('*.png')))}")
    print(f"WebP files written: {converted}")
    print(f"PNG total: {png_total / 1024 / 1024:.2f} MB")
    print(f"WebP total: {webp_total / 1024 / 1024:.2f} MB")
    print(f"Potential saving: {saved / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
