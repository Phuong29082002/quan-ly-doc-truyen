# PB56: đóng gói Web API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY QuanLyDocTruyen.API/QuanLyDocTruyen.API.csproj QuanLyDocTruyen.API/
RUN dotnet restore QuanLyDocTruyen.API/QuanLyDocTruyen.API.csproj
COPY QuanLyDocTruyen.API/ QuanLyDocTruyen.API/
RUN dotnet publish QuanLyDocTruyen.API/QuanLyDocTruyen.API.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "QuanLyDocTruyen.API.dll"]
