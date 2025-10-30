"""
Safe cleanup script for CornCare project
Removes test files, cache, and temporary data with confirmation
"""
import os
import shutil
from pathlib import Path
from typing import List, Tuple

class ProjectCleaner:
    def __init__(self, project_root: str = "."):
        self.root = Path(project_root).resolve()
        self.files_to_delete = []
        self.folders_to_delete = []
        self.total_size = 0
        
    def get_size(self, path: Path) -> int:
        """Calculate size of file or folder in bytes"""
        if path.is_file():
            return path.stat().st_size
        total = 0
        for item in path.rglob('*'):
            if item.is_file():
                try:
                    total += item.stat().st_size
                except:
                    pass
        return total
    
    def format_size(self, bytes: int) -> str:
        """Convert bytes to human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes < 1024.0:
                return f"{bytes:.2f} {unit}"
            bytes /= 1024.0
        return f"{bytes:.2f} TB"
    
    def scan_test_files(self):
        """Identify all test and temporary files"""
        
        # Backend test/tool files
        backend_test_patterns = [
            'backend/test_*.py',
            'backend/check_*.py',
            'backend/debug_*.py',
            'backend/show_*.py',
            'backend/init_database.py',
            'backend/send_approval_email.py',
            'backend/get_phone_number.py',
            'backend/jwt_info.py',
            'backend/admin_quick.py',
            'backend/admin_panel.py',
            'backend/otp_storage.json',
            'backend/prediction_log.csv',
        ]
        
        # Cache and compiled files
        cache_patterns = [
            '**/__pycache__',
            '**/*.pyc',
            '**/*.pyo',
            '**/*.pyd',
            '**/.pytest_cache',
            '**/.mypy_cache',
        ]
        
        # Temporary files
        temp_patterns = [
            '**/*.log',
            '**/*.tmp',
            '**/.DS_Store',
            '**/Thumbs.db',
            '**/*.swp',
            '**/*~',
        ]
        
        # Old model checkpoints (keep only the best)
        old_models = [
            'backend/corn_disease_model.h5.bak',
            'backend/corn_disease_model_best_20250830-*.h5',
            'backend/corn_disease_model_best_20250831-*.h5',
            'backend/corn_disease_model_best_20250901-*.h5',
        ]
        
        all_patterns = backend_test_patterns + cache_patterns + temp_patterns + old_models
        
        print("🔍 Scanning project for test files...\n")
        
        for pattern in all_patterns:
            for path in self.root.glob(pattern):
                if path.exists():
                    size = self.get_size(path)
                    self.total_size += size
                    
                    if path.is_dir():
                        self.folders_to_delete.append((path, size))
                    else:
                        self.files_to_delete.append((path, size))
        
        # Handle uploads separately (delete test images, keep folder)
        uploads_dir = self.root / 'backend' / 'uploads'
        if uploads_dir.exists():
            for item in uploads_dir.iterdir():
                if item.is_file() and item.name.startswith('test_'):
                    size = self.get_size(item)
                    self.total_size += size
                    self.files_to_delete.append((item, size))
    
    def display_summary(self):
        """Show what will be deleted"""
        print("=" * 70)
        print("📋 CLEANUP SUMMARY")
        print("=" * 70)
        
        if self.folders_to_delete:
            print(f"\n📁 Folders to delete ({len(self.folders_to_delete)}):")
            print("-" * 70)
            for path, size in sorted(self.folders_to_delete):
                rel_path = path.relative_to(self.root)
                print(f"  • {rel_path} ({self.format_size(size)})")
        
        if self.files_to_delete:
            print(f"\n📄 Files to delete ({len(self.files_to_delete)}):")
            print("-" * 70)
            for path, size in sorted(self.files_to_delete)[:20]:  # Show first 20
                rel_path = path.relative_to(self.root)
                print(f"  • {rel_path} ({self.format_size(size)})")
            
            if len(self.files_to_delete) > 20:
                print(f"  ... and {len(self.files_to_delete) - 20} more files")
        
        print("\n" + "=" * 70)
        print(f"💾 Total space to free: {self.format_size(self.total_size)}")
        print("=" * 70)
    
    def create_backup_list(self):
        """Save list of files being deleted"""
        backup_file = self.root / 'cleanup_backup_list.txt'
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write("CornCare Project - Deleted Files Backup List\n")
            f.write("=" * 70 + "\n\n")
            
            f.write("Folders:\n")
            for path, size in self.folders_to_delete:
                f.write(f"{path.relative_to(self.root)} ({self.format_size(size)})\n")
            
            f.write("\nFiles:\n")
            for path, size in self.files_to_delete:
                f.write(f"{path.relative_to(self.root)} ({self.format_size(size)})\n")
        
        print(f"\n💾 Backup list saved to: {backup_file}")
    
    def cleanup(self, create_backup: bool = True):
        """Perform the cleanup"""
        if not self.files_to_delete and not self.folders_to_delete:
            print("\n✨ No test files found. Project is already clean!")
            return
        
        self.display_summary()
        
        if create_backup:
            self.create_backup_list()
        
        print("\n⚠️  WARNING: This action cannot be undone!")
        response = input("\nProceed with cleanup? (yes/no): ").strip().lower()
        
        if response != 'yes':
            print("\n❌ Cleanup cancelled.")
            return
        
        deleted_files = 0
        deleted_folders = 0
        errors = []
        
        print("\n🧹 Cleaning up...")
        
        # Delete files first
        for path, _ in self.files_to_delete:
            try:
                path.unlink()
                deleted_files += 1
                print(f"  ✓ Deleted: {path.relative_to(self.root)}")
            except Exception as e:
                errors.append((path, str(e)))
                print(f"  ✗ Error: {path.relative_to(self.root)} - {e}")
        
        # Delete folders
        for path, _ in self.folders_to_delete:
            try:
                shutil.rmtree(path)
                deleted_folders += 1
                print(f"  ✓ Deleted: {path.relative_to(self.root)}")
            except Exception as e:
                errors.append((path, str(e)))
                print(f"  ✗ Error: {path.relative_to(self.root)} - {e}")
        
        # Summary
        print("\n" + "=" * 70)
        print("✅ CLEANUP COMPLETE")
        print("=" * 70)
        print(f"📁 Folders deleted: {deleted_folders}/{len(self.folders_to_delete)}")
        print(f"📄 Files deleted: {deleted_files}/{len(self.files_to_delete)}")
        print(f"💾 Space freed: {self.format_size(self.total_size)}")
        
        if errors:
            print(f"\n⚠️  {len(errors)} errors occurred:")
            for path, error in errors[:5]:
                print(f"  • {path.relative_to(self.root)}: {error}")
            if len(errors) > 5:
                print(f"  ... and {len(errors) - 5} more errors")
        
        print("\n🎉 Project cleaned successfully!")
    
    def dry_run(self):
        """Show what would be deleted without actually deleting"""
        self.display_summary()
        print("\n💡 This is a DRY RUN. No files were deleted.")
        print("   Run with --execute flag to perform actual cleanup.")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Safely cleanup test files from CornCare project'
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Actually delete files (default is dry-run)'
    )
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Skip creating backup list'
    )
    parser.add_argument(
        '--path',
        default='.',
        help='Project root path (default: current directory)'
    )
    
    args = parser.parse_args()
    
    print("🌽 CornCare Project Cleanup Tool")
    print("=" * 70 + "\n")
    
    cleaner = ProjectCleaner(args.path)
    cleaner.scan_test_files()
    
    if args.execute:
        cleaner.cleanup(create_backup=not args.no_backup)
    else:
        cleaner.dry_run()


if __name__ == "__main__":
    main()
