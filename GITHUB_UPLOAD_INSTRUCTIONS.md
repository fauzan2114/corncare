# GitHub Upload Instructions

## Step 1: Create GitHub Repository
1. Go to: https://github.com/new
2. Repository name: `corncare` (or your choice)
3. Description: "AI-powered corn disease detection system with FastAPI and React"
4. Visibility: Public or Private (your choice)
5. **DO NOT** check any boxes (README, .gitignore, license)
6. Click "Create repository"

## Step 2: Connect and Push

After creating the repository, run these commands in PowerShell:

```powershell
# Navigate to project directory
cd "C:\Users\ANSARI FAUZAN\Desktop\Project 1"

# Add remote repository (REPLACE 'YOUR_USERNAME' with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/corncare.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Verify Upload
Visit your repository URL: https://github.com/YOUR_USERNAME/corncare

You should see:
- ✅ All your files
- ✅ README.md displayed on the main page
- ✅ 1 commit

## Important Notes

### Large Files Warning
Your repository includes:
- **Model files** (~10-27 MB each): `*.h5`, `*.keras` files
- **Dataset images** (4000+ images): `backend/dataset/`

GitHub has a **100 MB** file size limit. If any single file exceeds this:
- The push will fail
- You'll need to use **Git LFS** (Large File Storage)

### If Push Fails Due to File Size:

1. **Option A: Exclude large files** (Recommended)
   ```powershell
   # Edit .gitignore to exclude dataset and old models
   # Add these lines to .gitignore:
   backend/dataset/
   *.h5
   *.keras
   
   # Remove them from Git tracking
   git rm -r --cached backend/dataset
   git rm --cached *.h5 *.keras
   
   # Commit and push
   git commit -m "Remove large files from repository"
   git push -u origin main
   ```

2. **Option B: Use Git LFS** (If you want to keep them)
   ```powershell
   # Install Git LFS from: https://git-lfs.github.com/
   
   # Initialize Git LFS
   git lfs install
   
   # Track large files
   git lfs track "*.h5"
   git lfs track "*.keras"
   git lfs track "backend/dataset/**"
   
   # Add .gitattributes
   git add .gitattributes
   git commit -m "Configure Git LFS for large files"
   
   # Push with LFS
   git push -u origin main
   ```

## Alternative: Upload Without Dataset

If you want a cleaner repository, I recommend:

1. **Keep only the best model** (corn_disease_model.h5)
2. **Exclude the dataset** (users can download separately)
3. **Add dataset link** to README.md

To do this:
```powershell
# Update .gitignore
echo "backend/dataset/" >> .gitignore
echo "corn_disease_model_best_*.h5" >> .gitignore

# Remove from Git
git rm -r --cached backend/dataset/
git rm --cached corn_disease_model_best_*.h5

# Commit
git commit -m "Exclude dataset and old model checkpoints"

# Push
git push -u origin main
```

## Updating Git User Info

If you want to change the email from the placeholder:
```powershell
git config user.email "your.real.email@example.com"
git commit --amend --reset-author --no-edit
git push -f origin main
```

## Future Updates

After the initial push, to update your repository:
```powershell
# Make your changes...

# Stage all changes
git add .

# Commit with a message
git commit -m "Description of changes"

# Push to GitHub
git push
```

## Common Issues

### 1. Authentication Required
GitHub may ask for credentials. Use a **Personal Access Token**:
- Generate at: https://github.com/settings/tokens
- Use token as password when prompted

### 2. Remote Already Exists
If you get "remote origin already exists":
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/corncare.git
```

### 3. Push Rejected
If push is rejected:
```powershell
git pull origin main --rebase
git push origin main
```

## Need Help?
- GitHub Documentation: https://docs.github.com/
- Git Documentation: https://git-scm.com/doc
