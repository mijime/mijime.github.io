```
pages/* -> src/applications/*

# src/applications は adapters と pages と usecases を繋ぐ
src/applications/* -> src/components/pages/*
src/applications/* -> src/usecases/*
src/applications/* -> src/adapters/*

# src/usecases は domains を繋ぐ
src/adapters/* -> src/domains/repositories/*
src/usecases/* -> src/domains/*

src/components/pages/*     -> src/components/organisms/*
src/components/pages/*     -> src/components/templates/*

src/components/pages/*     -> src/domains/*


src/components/molecules/* -> src/components/atoms/*
src/components/organisms/* -> src/components/domains/*
src/components/organisms/* -> src/components/molecules/*
src/components/organisms/* -> src/components/usecases/*
src/components/templates/* -> src/components/organisms/*
```
