FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution file and restore as distinct layers
COPY ["EYExpenseManager.sln", "./"]
COPY ["EYExpenseManager.API/EYExpenseManager.API.csproj", "EYExpenseManager.API/"]
COPY ["EYExpenseManager.Application/EYExpenseManager.Application.csproj", "EYExpenseManager.Application/"]
COPY ["EYExpenseManager.Core/EYExpenseManager.Core.csproj", "EYExpenseManager.Core/"]
COPY ["EYExpenseManager.Infrastructure/EYExpenseManager.Infrastructure.csproj", "EYExpenseManager.Infrastructure/"]

RUN dotnet restore

# Copy the rest of the source code
COPY . .
WORKDIR "/src/EYExpenseManager.API"
RUN dotnet build "EYExpenseManager.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "EYExpenseManager.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "EYExpenseManager.API.dll"]
