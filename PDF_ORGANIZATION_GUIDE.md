# PDF Organization Guide

## 📁 Where to Keep PDFs

### Main Directory
All PDFs should be placed in:
```
d:\app_intern\website_frontend\public\pdfs\
```

### Folder Structure

Create folders following this pattern:
```
public/
└── pdfs/
    ├── class6/
    │   ├── math/
    │   ├── science/
    │   ├── english/
    │   └── social/
    ├── class7/
    │   ├── math/
    │   ├── science/
    │   ├── english/
    │   ├── social/
    │   ├── hindi/
    │   ├── biology/
    │   └── telugu/
    ├── class8/
    │   ├── math/
    │   ├── science/
    │   ├── english/
    │   ├── social/
    │   ├── hindi/
    │   ├── biology/
    │   └── telugu/
    ├── class9/
    │   ├── math/
    │   ├── science/
    │   ├── english/
    │   ├── social/
    │   ├── hindi/
    │   ├── biology/
    │   └── telugu/
    └── class10/
        ├── math/
        ├── science/
        ├── english/
        ├── social/
        ├── hindi/
        ├── biology/
        └── telugu/
```

## 📝 Naming Convention

### Rules:
1. **Use lowercase** for all folder and file names
2. **Use hyphens** or **underscores** for spaces (not spaces!)
3. **Be descriptive** but concise
4. **Use .pdf extension**

### Good Examples:
✅ `integers.pdf`
✅ `fractions-and-decimals.pdf`
✅ `cell-structure.pdf`
✅ `photosynthesis.pdf`
✅ `the-road-not-taken.pdf`

### Bad Examples:
❌ `Integers.pdf` (uppercase)
❌ `fractions and decimals.pdf` (spaces)
❌ `Chapter 1.pdf` (not descriptive)
❌ `ch1.pdf` (too short)

## 🗂️ Complete Folder Structure Commands

### For Windows PowerShell:
Run these commands in PowerShell to create all folders:

```powershell
# Navigate to public directory
cd d:\app_intern\website_frontend\public

# Create all class folders
$classes = @("class6", "class7", "class8", "class9", "class10")
$subjects = @("math", "science", "english", "social", "hindi", "biology", "telugu")

foreach ($class in $classes) {
    foreach ($subject in $subjects) {
        New-Item -ItemType Directory -Path "pdfs\$class\$subject" -Force
    }
}
```

### Manual Creation:
Or create manually:
1. Go to `d:\app_intern\website_frontend\public\`
2. Create folder `pdfs` (if not exists)
3. Inside `pdfs`, create: `class6`, `class7`, `class8`, `class9`, `class10`
4. Inside each class folder, create: `math`, `science`, `english`, `social`, `hindi`, `biology`, `telugu`

## 📚 Example: Adding PDFs for Class 7 Math

### Step 1: Place PDFs
Put your PDF files in:
```
d:\app_intern\website_frontend\public\pdfs\class7\math\
```

Example files:
- `integers.pdf`
- `fractions-and-decimals.pdf`
- `rational-numbers.pdf`
- `simple-equations.pdf`
- `lines-and-angles.pdf`

### Step 2: Update syllabus.js
Edit: `d:\app_intern\website_frontend\src\config\syllabus.js`

```javascript
"Class 7": {
    subjects: [
        {
            id: 1,
            name: "Mathematics",
            icon: "📐",
            color: "#667eea",
            chapters: [
                {
                    id: 1,
                    name: "Integers",
                    pdfUrl: "/pdfs/class7/math/integers.pdf",
                    description: "Learn about positive and negative numbers"
                },
                {
                    id: 2,
                    name: "Fractions and Decimals",
                    pdfUrl: "/pdfs/class7/math/fractions-and-decimals.pdf",
                    description: "Understanding fractions and decimal numbers"
                },
                {
                    id: 3,
                    name: "Rational Numbers",
                    pdfUrl: "/pdfs/class7/math/rational-numbers.pdf",
                    description: "Introduction to rational numbers"
                },
                {
                    id: 4,
                    name: "Simple Equations",
                    pdfUrl: "/pdfs/class7/math/simple-equations.pdf",
                    description: "Solving linear equations"
                },
                {
                    id: 5,
                    name: "Lines and Angles",
                    pdfUrl: "/pdfs/class7/math/lines-and-angles.pdf",
                    description: "Understanding geometric concepts"
                }
            ]
        }
    ]
}
```

## 🔗 URL Pattern

The `pdfUrl` in syllabus.js should follow this pattern:
```
/pdfs/{class}/{subject}/{chapter-name}.pdf
```

Examples:
- `/pdfs/class7/math/integers.pdf`
- `/pdfs/class8/science/cell-structure.pdf`
- `/pdfs/class9/english/the-road-not-taken.pdf`
- `/pdfs/class10/social/indian-constitution.pdf`

## ✅ Current Status

### Already Created:
```
✅ public/pdfs/class7/math/integers.pdf
✅ public/pdfs/class7/math/fractiona nd decimal.pdf
```

### Need to Create:
All other subjects and classes need PDFs added.

## 📋 Quick Reference Table

| Class | Subject | Folder Path |
|-------|---------|-------------|
| Class 6 | Math | `public/pdfs/class6/math/` |
| Class 6 | Science | `public/pdfs/class6/science/` |
| Class 7 | Math | `public/pdfs/class7/math/` |
| Class 7 | Science | `public/pdfs/class7/science/` |
| Class 7 | English | `public/pdfs/class7/english/` |
| Class 7 | Social | `public/pdfs/class7/social/` |
| Class 7 | Hindi | `public/pdfs/class7/hindi/` |
| Class 7 | Biology | `public/pdfs/class7/biology/` |
| Class 7 | Telugu | `public/pdfs/class7/telugu/` |
| Class 8 | Math | `public/pdfs/class8/math/` |
| ... | ... | ... |

## 🚀 Steps to Add PDFs

### For Each Subject:

1. **Create Folder** (if not exists):
   ```
   public/pdfs/class{X}/{subject}/
   ```

2. **Add PDF Files**:
   - Copy your PDF files to the folder
   - Rename them following naming convention

3. **Update syllabus.js**:
   - Open `src/config/syllabus.js`
   - Find the class and subject
   - Add chapter entries with `pdfUrl`

4. **Test**:
   - Login to website
   - Select the class
   - Click on subject
   - Click on chapter
   - PDF should load

## 💡 Tips

### 1. Organize Before Upload
- Rename all PDFs first
- Check for typos
- Ensure consistent naming

### 2. File Size
- Keep PDFs under 10MB if possible
- Compress large PDFs
- Use PDF optimization tools

### 3. Quality
- Ensure PDFs are readable
- Check all pages load
- Verify text is selectable

### 4. Testing
- Test each PDF after adding
- Check on different browsers
- Verify mobile compatibility

## 🔧 Troubleshooting

### PDF Not Loading?

1. **Check file path**:
   - Ensure folder structure is correct
   - Verify file name matches syllabus.js

2. **Check file name**:
   - No spaces (use hyphens)
   - All lowercase
   - Correct extension (.pdf)

3. **Check syllabus.js**:
   - Correct pdfUrl path
   - Starts with `/pdfs/`
   - Matches actual file location

4. **Refresh browser**:
   - Clear cache (Ctrl + Shift + R)
   - Hard reload
   - Check browser console for errors

## 📊 Progress Tracking

### Current:
- ✅ Class 7 Math: 2 PDFs added
- ⏳ All other subjects: Need PDFs

### To Complete:
- [ ] Class 6: All subjects
- [ ] Class 7: Science, English, Social, Hindi, Biology, Telugu
- [ ] Class 8: All subjects
- [ ] Class 9: All subjects
- [ ] Class 10: All subjects

## 🎯 Priority Order

1. **Class 7** (most common):
   - Math ✅ (partially done)
   - Science
   - English
   - Social Studies

2. **Class 8**:
   - Math
   - Science
   - English
   - Social Studies

3. **Class 9 & 10**:
   - Focus on board exam subjects
   - Math, Science, English, Social

4. **Class 6**:
   - Foundation subjects

## 📞 Need Help?

If you have PDFs ready:
1. Tell me which class and subject
2. I'll show you exact folder path
3. I'll help update syllabus.js

Example:
"I have 10 Science PDFs for Class 8"
→ I'll tell you: Put them in `public/pdfs/class8/science/`
→ I'll help you update the syllabus configuration

---

**Summary**: Put all PDFs in `d:\app_intern\website_frontend\public\pdfs\{class}\{subject}\` and update `syllabus.js` with the paths!
